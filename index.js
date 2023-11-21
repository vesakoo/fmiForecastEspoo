/**
 * Program reads temperature forecast from Ilmatieteenlaitos (fmi)
 * on Espoo/Finland -area and stores the data into compact format.
 * output data is fitted to  16x2 (or 3) lcd panel.
 * two first datarows are temp forecast table
 * third datarow is closest current temperature
 * <Parameter name="parameters" type="NameList">
 * <Title>Parameters to return</Title>
 * <Abstract> Comma separated list of meteorological parameters to return.
 * In addition to default parameters, there is 'RadiationDiffuseAccumulation'
 * parameter that is not distributed in grib2 format. Default:
 * GeopHeight,Temperature,Pressure,Humidity,WindUMS,WindVMS,MaximumWind,
 * WindGust,DewPoint,TotalCloudCover,LowCloudCover,MediumCloudCover,HighCloudCover,
 * Precipitation1h,PrecipitationAmount,RadiationGlobalAccumulation,RadiationLWAccumulation,
 * RadiationNetSurfaceLWAccumulation,RadiationNetSurfaceSWAccumulation,LandSeaMask,
 * WindSpeedMS,WindDirection,Cape </Abstract>
 * </Parameter>
 */
const axios = require('axios');
const libxml = require('libxmljs');
const fs = require('fs');
const now = new Date();
const utc = new Date(now).toJSON();
const endUtc = new Date(new Date(now.getTime() + 25 * 60 * 60 * 1000)).toJSON();
//console.log('utc', utc,' end ', endUtc);
const forecastDisplayHours = [8, 12, 18, 21];
const forecastFile = './forecast.txt';
const forecastHtml = './forecast.html';

//const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::point::timevaluepair&parameters=Temperature&place=Espoo&starttime=${utc}&endtime=${endUtc}&timestep=60`;
//const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::point::timevaluepair&parameters=Temperature,smartsymboltext&place=Espoo&starttime=${utc}&endtime=${endUtc}&timestep=60`;
//console.log('url', url);

const urlParams = {
  baseURL: 'https://opendata.fmi.fi',
  method: 'GET',
  url: '/wfs',
  params: {
    service: 'WFS',
    version: '2.0.0',
    request: 'getFeature',
    storedquery_id:
      'fmi::forecast::edited::weather::scandinavia::point::timevaluepair',
    latlon: '60.1836468,24.6440379',
    //place: 'Espoo',
    parameters:
      'Temperature,smartsymbol,smartsymboltext,windspeedms,WindDirection',
    lang: 'fi',
    starttime: utc,
    endtime: endUtc,
    timestep: 60,
  },
};

//*data source
axios
  .request(urlParams)
  //axios.get(url)
  .then((response) => {
    //console.log('here!!',request.url)

    const xmlData = response.data;
    //console.log(xmlData)
    const xpathTemp = '//gml:doubleOrNilReasonTupleList';
    const xmlDoc = libxml.parseXmlAsync(xmlData).then((xmlDoc) => {
      const begin = xmlDoc
        .find('//gml:beginPosition', {
          gml: 'http://www.opengis.net/gml/3.2',
        })[0]
        .text()
        .trim();
      const end = xmlDoc
        .find('//gml:endPosition', { gml: 'http://www.opengis.net/gml/3.2' })[0]
        .text()
        .trim();
      //console.log('begin', new Date(begin),'end',new Date(end))

      //data model
      /*const smartText = xmlDoc.find(
        '//wml2:MeasurementTimeseries[@gml:id="mts-1-1-smartsymboltext"]/wml2:point/wml2:MeasurementTVP/wml2:value',
        {
          wml2: 'http://www.opengis.net/waterml/2.0',
          gml: 'http://www.opengis.net/gml/3.2'
        }
      )[0].text()*/

      const smartTexts = timeValParser(xmlDoc, 'mts-1-1-smartsymboltext').map(
        (item) => ({ ...item, smartText: item.val })
      );

      const measures = timeValParser(xmlDoc, 'mts-1-1-Temperature').map(
        (item) => ({
          ...item,
          temp: Math.round(item.val),
        })
      );

      //symbols 107 and 157 are missing (night symbols)
      //replace with daysymbols
      const smartIcon = timeValParser(xmlDoc, 'mts-1-1-smartsymbol').map(
        (item) => ({
          ...item,
          symbol:
            Number(item.val) === 107 || Number(item.val) === 157
              ? Number(item.val) - 100
              : item.val,
        })
      );

      const windMeasures = timeValParser(xmlDoc, 'mts-1-1-windspeedms').map(
        (item) => ({ ...item, wind: item.val })
      );

      const windDirVals = timeValParser(xmlDoc, 'mts-1-1-WindDirection').map(
        (item) => ({ ...item, windDirection: item.val })
      );

      const allMeasures = measures.map((measure) => {
        const icon = smartIcon.find((ico) => ico.hours === measure.hours);
        const wind = windMeasures.find((wind) => wind.hours === measure.hours);
        const windDir = windDirVals.find(
          (wind) => wind.hours === measure.hours
        );
        const smartText = smartTexts.find(
          (text) => text.hours === measure.hours
        );

        return {
          ...measure,
          symbol: icon.symbol,
          smartText: smartText.val,
          wind: wind.wind,
          windDir: windDir.windDirection,
        };
      });

      console.log('data', allMeasures);

      //data render
      const fileContent = measures
        .filter(
          (elem, index) =>
            index == 0 || forecastDisplayHours.includes(elem.hours)
        )
        .filter((r, index) => /*r.hours>7 && index <4*/ index > 0)
        .map((row) => (row.hours > 10 ? ` ${row.hours}|` : ` 0${row.hours}|`))
        .concat('\n')
        .concat(
          measures
            .filter(
              (elem, index) =>
                index == 0 || forecastDisplayHours.includes(elem.hours)
            )
            .filter((r, index) => /*r.hours>7 && index <4*/ index > 0)
            .map((row) =>
              row.temp.toString().length < 3
                ? row.temp.toString().length < 2
                  ? `  ${row.temp}|`
                  : ` ${row.temp}|`
                : `${row.temp}|`
            )
        )

        .concat(`\nUlko: ${measures[0].temp}'C`)
        //.concat(`\n${smartTexts[0].val}`)
        .join('');
      console.log(fileContent);

      try {
        fs.writeFileSync(forecastFile, fileContent);
      } catch (err) {
        console.error(err);
      }
      try {
        fs.writeFileSync('weather.json',JSON.stringify(allMeasures) , 'utf8');
      } catch (err) {
        console.error(err);
      }

      const htmlFileContent = pageStart
        .concat(
          allMeasures
            .map((measure) => {
              return getRow(measure);
            })
            .join('')
        )
        .concat(pageEdn);

      try {
        fs.writeFileSync(forecastHtml, htmlFileContent);
      } catch (err) {
        console.error(err);
      }
    });
  })
  .catch((error) => {
    console.error('HTTP-pyyntö epäonnistui:', error);
  });

const pageStart =
  '<html>\n\t<body>\n\t\t<table>\n \
    <tr><th>Hour</th><th>Temp</th><th>Wind m/s</th><th>weather</th></tr>\n';
const getRow = (row) => {
  return `\t\t\t<tr>\
      <td>${row.hours}:00</td> \
      <td>${row.temp} &deg;C</td> \
      <td>${Math.round(row.wind)} m/s ${windArrow(-1*row.windDir)} </td> \
      <td><img src='./SmartSymbol/light/${row.symbol}.svg'/> ${row.smartText}</td>\
    </tr>\n`;
};

//const windArrow =(degr)=> (`<svg fill="#000000" height="40px" width="40px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 488.98 488.98" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path style="transform: rotate(${degr}deg)" d="M409.49,485.75l-165-80.9l-165,80.9c-25.3,12.4-52.4-13.1-41.6-39.1l178.5-427.9c10.4-25,45.8-25,56.3,0l178.4,427.9 C461.89,472.55,434.79,498.15,409.49,485.75z"></path> </g> </g> </g></svg>`)
const windArrow =(degr)=> (`<svg width="40" height="40" viewBox="0 0 1.8 1.8" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" transform="matrix(1,0,0,-1,0,0)"><path style="transform: rotate(${degr}deg);transform-origin: 50% 50%;" d="M1.383.78.9.3.417.78a.05.05 0 1 0 .071.07L.85.491v.957a.05.05 0 1 0 .1 0V.491l.363.359a.05.05 0 0 0 .07-.071Z" class="clr-i-outline clr-i-outline-path-1"></path><path d="M0 0h1.8v1.8H0V0z" fill="none"></path></svg>`)

const pageEdn = '\t\t</table>\n\t</body>\n</html>';

const timeValParser = (xmlDoc, gmlId) => {
  return xmlDoc
    .find(
      `//wml2:MeasurementTimeseries[@gml:id="${gmlId}"]/wml2:point/wml2:MeasurementTVP`,
      {
        wml2: 'http://www.opengis.net/waterml/2.0',
        gml: 'http://www.opengis.net/gml/3.2',
      }
    )
    .map((element) => {
      const time = element
        .find('./wml2:time', { wml2: 'http://www.opengis.net/waterml/2.0' })[0]
        .text();
      const val = element
        .find('./wml2:value', { wml2: 'http://www.opengis.net/waterml/2.0' })[0]
        .text();
      //symbols 107 and 157 are missing (night symbols)
      //replace with daysymbols
      return {
        time: time,
        hours: new Date(time).getHours(),
        val: val,
      };
    });
  //.filter((elem,index)=> (index==0||forecastDisplayHours.includes(elem.hours)) )
};
