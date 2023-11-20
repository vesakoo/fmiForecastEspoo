const axios = require('axios');
const fs = require('fs');
const now = new Date();
const utc = new Date(now).toJSON();
const endUtc = new Date(new Date(now.getTime()+25*60*60*1000)).toJSON();
//console.log('utc', utc,' end ', endUtc);
const forecastDisplayHours= [8,12,18,21];
const forecastFile = './forecast.html'

const url = `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::point::timevaluepair&parameters=Temperature&place=Espoo&starttime=${utc}&endtime=${endUtc}&timestep=60`;

const urlParams = {
  baseURL: 'https://opendata.fmi.fi',
  method: "GET",
  url: '/timeseries',
  params: {
    latlon : '60.1836468,24.6440379',
    param : 'time,temperature,windspeedms,smartsymbol', //smartsymboltext',
    lang : 'fi',
    starttime : utc,
    endtime : endUtc,
    timestep : 60
  },
}

axios.request(urlParams)
  .then((response) => {
    const series = response.data
    .split('\n')
  .filter(row => row.split(' ')[1]!== undefined)
    .map((row) =>{
      const fields = row.split(' ')
      const rowObj = {
        time:  fields[0].substring(9,11),
        temp: fields[1],
        wind: fields[2],
        icon: Number(fields[3])===107||Number(fields[3])===157?Number(fields[3])-100:fields[3]
      }
      return rowObj
    })
    const inHtml = series.map((row) =>{
      return getRow(row)
    } ).join('')
    
    console.log('semmottii',inHtml)
    const fileContent =pageStart.concat(inHtml).concat(pageEdnd)

    try{
      fs.writeFileSync(forecastFile,fileContent)      
    } catch (err) {
      console.error(err);
    }
    
  })

  const pageStart = '<html>\n\t<body>\n\t\t<table>\n';
  const getRow = ((row)=>{
    return `\t\t\t<tr><td>${row.time}</td><td>${row.temp} 'C</td><td><img src='./SmartSymbol/light/${row.icon}.svg'/></td></tr>\n`
  })
  const pageEdnd = '\t\t</table>\n\t</body>\n</html>'





/*const fetchData = async () => {
  try {
    const response = await axios.request(axiosParams);
    setData(response.data);
    setHeaders(response.headers)
  } catch (error) {
    setError(error);
    setLoading(false);
  } finally {
    setLoading(false);
  }
};*/


