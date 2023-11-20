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
const endUtc = new Date(new Date(now.getTime()+25*60*60*1000)).toJSON();
//console.log('utc', utc,' end ', endUtc);
const forecastDisplayHours= [8,12,18,21];  
const forecastFile = './forecast.txt'
const forecastHtml = './forecast.html'

//const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::point::timevaluepair&parameters=Temperature&place=Espoo&starttime=${utc}&endtime=${endUtc}&timestep=60`;
//const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::point::timevaluepair&parameters=Temperature,smartsymboltext&place=Espoo&starttime=${utc}&endtime=${endUtc}&timestep=60`;
//console.log('url', url);

const urlParams = {
  baseURL: 'https://opendata.fmi.fi',
  method: "GET",
  url: '/wfs',
  params: {
    service: 'WFS',
    version: '2.0.0',
    request: 'getFeature',
    storedquery_id: 'fmi::forecast::edited::weather::scandinavia::point::timevaluepair', 
    //latlon : '60.1836468,24.6440379',
    place: 'Espoo',
    parameters : 'Temperature,smartsymbol,smartsymboltext,windspeedms,WindDirection',
    lang : 'fi',
    starttime : utc,
    endtime : endUtc,
    timestep : 60
  },
}


//*data source
axios.request(urlParams)
//axios.get(url)
  .then((response) => {
    //console.log('here!!',request.url)

    const xmlData = response.data;
    //console.log(xmlData)
    const xpathTemp = "//gml:doubleOrNilReasonTupleList"
    const xmlDoc = libxml.parseXmlAsync(xmlData)
    .then((xmlDoc) => {
      const begin = xmlDoc.find(
        '//gml:beginPosition',
        {gml: 'http://www.opengis.net/gml/3.2'}
      )[0].text().trim();
      const end =xmlDoc.find(
        '//gml:endPosition',
        {gml: 'http://www.opengis.net/gml/3.2'}
      )[0].text().trim(); 
      //console.log('begin', new Date(begin),'end',new Date(end))

//*data model
      const measures = xmlDoc
        .find(
          '//wml2:MeasurementTimeseries[@gml:id="mts-1-1-Temperature"]/wml2:point/wml2:MeasurementTVP',
          {
            wml2: 'http://www.opengis.net/waterml/2.0',
            gml: 'http://www.opengis.net/gml/3.2'
          }
        )
        .map((element)=>{
          const time = element.find(
            './wml2:time'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
          )[0].text()
          const val = element.find(
            './wml2:value'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
            )[0].text()
            //console.log('time:',time,'temp',val);
            return {'time': time, 'hours': new Date(time).getHours(), 'temp':Math.round(val)}
        } ).filter((elem,index)=> (index==0||forecastDisplayHours.includes(elem.hours) ) )
     
      const smartText = xmlDoc.find(
        '//wml2:MeasurementTimeseries[@gml:id="mts-1-1-smartsymboltext"]/wml2:point/wml2:MeasurementTVP/wml2:value',
        {
          wml2: 'http://www.opengis.net/waterml/2.0',
          gml: 'http://www.opengis.net/gml/3.2'
        }
      )[0].text()

      const smartIcon = xmlDoc
        .find(
          '//wml2:MeasurementTimeseries[@gml:id="mts-1-1-smartsymbol"]/wml2:point/wml2:MeasurementTVP',
          {
            wml2: 'http://www.opengis.net/waterml/2.0',
            gml: 'http://www.opengis.net/gml/3.2'
          }
        )
        .map((element)=>{
          const time = element.find(
            './wml2:time'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
          )[0].text()
          const val = element.find(
            './wml2:value'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
            )[0].text()
            //symbols 107 and 157 are missing (night symbols)
            //replace with daysymbols
            return {
              'time': time, 
              'hours': new Date(time).getHours(), 
              'symbol': Number(val)===107||Number(val)===157?Number(val)-100:val
            }
        } )
        .filter((elem,index)=> (index==0||forecastDisplayHours.includes(elem.hours)) )

        const windMeasures = xmlDoc
        .find(
          '//wml2:MeasurementTimeseries[@gml:id="mts-1-1-windspeedms"]/wml2:point/wml2:MeasurementTVP',
          {
            wml2: 'http://www.opengis.net/waterml/2.0',
            gml: 'http://www.opengis.net/gml/3.2'
          }
        )
        .map((element)=>{
          const time = element.find(
            './wml2:time'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
          )[0].text()
          const val = element.find(
            './wml2:value'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
            )[0].text()
            //symbols 107 and 157 are missing (night symbols)
            //replace with daysymbols
            return {
              'time': time, 
              'hours': new Date(time).getHours(), 
              'wind': val
            }
        } )
        .filter((elem,index)=> (index==0||forecastDisplayHours.includes(elem.hours)))

        const windDirVals = xmlDoc
        .find(
          '//wml2:MeasurementTimeseries[@gml:id="mts-1-1-WindDirection"]/wml2:point/wml2:MeasurementTVP',
          {
            wml2: 'http://www.opengis.net/waterml/2.0',
            gml: 'http://www.opengis.net/gml/3.2'
          }
        )
        .map((element)=>{
          const time = element.find(
            './wml2:time'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
          )[0].text()
          const val = element.find(
            './wml2:value'
            ,{wml2: 'http://www.opengis.net/waterml/2.0'}
            )[0].text()
            return {
              'time': time, 
              'hours': new Date(time).getHours(), 
              'windDirection': val
            }
        } )
        .filter((elem,index)=> (index==0||forecastDisplayHours.includes(elem.hours)))

        const allMeasures = measures.map((measure) => {
          const icon = smartIcon.find((ico)=> (ico.hours===measure.hours))
          const wind = windMeasures.find((wind) =>(wind.hours === measure.hours ))
          const windDir = windDirVals.find((wind) =>(wind.hours === measure.hours ))

          return {...measure, symbol: icon.symbol, wind: wind.wind, windDir: windDir.windDirection }
        })

console.log('data', allMeasures)
        
      

//*data render
      const fileContent = measures
        .filter((r,index)=>/*r.hours>7 && index <4*/ index>0)
        .map((row)=>row.hours>10?` ${row.hours}|`:` 0${row.hours}|`)
        .concat('\n')

        .concat(measures
          .filter((r,index)=>/*r.hours>7 && index <4*/ index >0)
          .map((row)=>(
            row.temp.toString().length<3
            ?row.temp.toString().length<2
              ?`  ${row.temp}|`
              :` ${row.temp}|`
            :`${row.temp}|`)))

        .concat(`\nUlko: ${measures[0].temp}'C`)
        .concat(`\n${smartText}`)
        .join('');
      console.log(fileContent); 

      try{
        fs.writeFileSync(forecastFile,fileContent)      
      } catch (err) {
        console.error(err);
      }
      
      const htmlFileContent = pageStart.concat( 
        allMeasures.map((measure)=>{
          return getRow(measure)
        }).join('')
      )
      .concat(pageEdn)
     
      try{
        fs.writeFileSync(forecastHtml,htmlFileContent)      
      } catch (err) {
        console.error(err);
      }

    });
  })  
  .catch((error) => {
    console.error('HTTP-pyyntö epäonnistui:', error);
  });



  const pageStart = '<html>\n\t<body>\n\t\t<table>\n<tr><th>Hour</th><th>temp</th><th>weather</th></tr>';
  const getRow = ((row)=>{
    return `\t\t\t<tr><td>${row.hours}:00:00</td><td>${row.temp} 'C</td><td><img src='./SmartSymbol/light/${row.symbol}.svg'/></td></tr>\n`
  })
  const pageEdn = '\t\t</table>\n\t</body>\n</html>'
