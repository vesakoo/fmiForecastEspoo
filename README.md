# fmiForecastEspoo

## Espoo area temperature forecast and current temp fitted to be displayed 16x2 lcd panel

Program reads temperature forecast from Ilmatieteenlaitos (fmi)
on Espoo/Finland -area and stores the data into compact format.   
Output data is fitted to  16x2 (or 3) lcd panel.
* two first datarows are temp forecast table
* third datarow is closest current temperature

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
    


