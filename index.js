/**
 * Program reads temperature forecast from Ilmatieteenlaitos (fmi)
 * on Espoo/Finland -area and stores the data into compact format.
 * output data is fitted to  16x2 (or 3) lcd panel.
 * two first datarows are temp forecast table
 * third datarow is closest current temperature
 */
const axios = require('axios');
const libxml = require('libxmljs');
const fs = require('fs');
const now = new Date();
const utc = new Date(now.toUTCString()).toJSON();
const endUtc = new Date(new Date(now.getTime()+25*60*60*1000).toUTCString()).toJSON();
//console.log('utc', utc,' end ', endUtc);
const forecastFile = './forecast.txt'

const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::point::timevaluepair&parameters=Temperature&place=Espoo&starttime=${utc}&endtime=${endUtc}&timestep=60`;
console.log('url', url);
axios.get(url)
  .then((response) => {
    const xmlData = response.data;
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
      const measures = xmlDoc.find('//wml2:MeasurementTVP',
        {wml2: 'http://www.opengis.net/waterml/2.0'}
      ).map((element)=>{
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
      } ).filter((elem,index)=> (index==0||elem.hours===8||elem.hours===12||elem.hours===18||elem.hours===21) )
      console.log('measures',measures);

      const fileContent=measures.filter((r,index)=>/*r.hours>7 && index <4*/ index>0).map((row)=>row.hours>10?` ${row.hours}|`:` 0${row.hours}|`)
        .concat('\n')
        .concat(measures
          .filter((r,index)=>r.hours>7 && index <4)
          .map((row)=>(
            row.temp.toString().length<3
            ?row.temp.toString().length<2
              ?`  ${row.temp}|`
              :` ${row.temp}|`
            :`${row.temp}|`)))
        .concat(`\nUlko: ${measures[0].temp}'C`)
        .join('');
      //.concat(`ULko: ${measure[0].temp}'C`);
      console.log(fileContent); 

      try{
        fs.writeFileSync(forecastFile,fileContent)      
      } catch (err) {
        console.error(err);
      }
    });
  })  
  .catch((error) => {
    console.error('HTTP-pyyntö epäonnistui:', error);
  });
