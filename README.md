# fmiForecastEspoo

## Espoo area temperature forecast and current temp fitted to be displayed 16x2 lcd panel

Program reads temperature forecast from Ilmatieteenlaitos (fmi)
on Espoo/Finland -area and stores the data into compact format.

Output data is stored in three different format:   

1) fitted to  16x2 (or 3) lcd panel.
* two first datarows are temp forecast table
* third datarow is closest current temperature

2) json data   
3) html page   


## Installation
 * Download files
 * run npm i 
## Run
 node index.js   
 (optional) run with crontab once per hour

 ### Requirements   
 Server timezone should match Europe/Helsinki   
 ``` 
 sudo timedatectl set-timezone Europe/Helsinki   
 timedatectl
 ```
 ### example clients:
 https://github.com/vesakoo/FmiWeatherStationESP32S3   
 - uses json output

 https://github.com/vesakoo/mkrThermoClient  
 -uses lcd panel and txt output

 ### Check also:  
 https://www.ilmatieteenlaitos.fi/latauspalvelun-pikaohje

 For symbols, link svg symbols from here to your webfolder:   
 https://github.com/fmidev/opendata-resources/tree/master/symbols
 
    


