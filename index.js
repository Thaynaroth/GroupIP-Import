const proced = require('./procedure')
const config  = require('./config')
const axios = require('axios')
const moment = require('moment');
const selectDate = `${moment().format('yyyyMMDD')}-${moment().subtract(1,'days').format('yyyyMMDD')}`
// const selectDate = `20210603-20210604`

class ImportData {

    constructor(){
        // numSecuList Stored all personnel's numSecu that already exsit in Database
        this.numSecuList = []
        // fieldMatchPendoreTempo[] stored JSON read, for matching field between Pandore and tempo.  
        this.fieldMatchPendoreTempo = []
        this.API_URL = "http://10.100.3.4:8085/API/Tempo/"

        // Loading all personnels numSecu to numSecuList[]
        proced.loadPersonnels
            .then( allNumSecu => allNumSecu.forEach(personnel =>  this.numSecuList.push(personnel.per_numSecu)) )
            .catch( (err) => {
                proced.logg(err)
                config.sendMail({
                    subject: `Pandore import problem: ${moment().format('YYYY-MM-DD')}`,
                    html: err
                })            
                config.closeConnection()
            } )

        // Loading field match between Pandor and tempo
        proced.readJSON('pandoreTempo.json')
            .then( result => this.fieldMatchPendoreTempo = result )

    }
    // End constructor

    
    getContratFromDate(selectDate) {
        return new Promise((resolve, reject) => {
            axios(config.requestOption(`${this.API_URL}CONTRAT?Dossier=DNK&DateCreation=${selectDate}`))
                .then( contrats =>  {
                    if (contrats.data.length < 1 ) { reject(`There is no contrat between selected date`); return; } 
                    resolve(contrats.data)   
                })
                .catch( () => reject(`Can not connect to API`) )
        })    
    }
    // End getContratFromDate

    insertPersonnelData(singlePersonnel,fieldMatchPendoreTempo) {
        // Check if personnel already exist in Database will skip insertion
        if(this.numSecuList.includes(singlePersonnel.NumeroSecu)) {
            proced.logg(`${singlePersonnel.Nom} existed , skip!`)
            return;
        }
        
        // if numerSecu is not exist yet add it to exist list and insert basic data first then insert other data
        this.numSecuList.push(singlePersonnel.NumeroSecu)
        proced.insertBasicPersonnelInfo(singlePersonnel)

                .then( personnelInserted => { 
                    // find each TabCartes if it found in json file then start insert other informations
                    singlePersonnel.TabCartes.forEach( tabCarte => {

                            let foundMatch = 
                            fieldMatchPendoreTempo.find( field => {
                                    if(!field.tempoFullName) return;
                                    let nameFromJson = field.tempoFullName.toLowerCase()
                                    let nameFromAPI = tabCarte.TxtCarte.toLowerCase()
                                    return nameFromAPI.includes(nameFromJson)
                            } )  
    
                            if(foundMatch){
                                proced.insertOtherInfo( tabCarte , personnelInserted.insertId , foundMatch )
                                    .then( () => { proced.logg(`+ ${singlePersonnel.Nom} - ${foundMatch.type}: ${foundMatch.fullName}`) })
                            }

                    } )               
                }) 

                .catch( err => {
                    proced.logg(err)
                    process.exit(0)
                })
        
    }
    // End insertPersonnelData



    runImport(selectDate) {
        // Log date&time of process to console and log file
        proced.logg(`Run at ${moment().format('MMMM Do YYYY, h:mm:ss a')} data from - date ${selectDate}`)

        // Step1: After constructor loaded. We requesting contrats data between date
        this.getContratFromDate(selectDate)

            .then( contrats => {
                // Step2: After we can get contrats > 0, We loop checking for pandore contrats
                contrats.forEach(contrat => {

                        if(contrat.Reference2 !== 'PANDORE')  {
                            proced.logg("Not Pandore contract, skip!"); return;
                        }

                        // Step3: If found Pandore contrat, We request that personnel info by ID in the contrat found
                        axios(config.requestOption(`${this.API_URL}INTERIMAIRE?Dossier=DNK&ID=${contrat.IdInterimaire}`))
                            .then( personnel =>  {
                                // Step4: Insert Info Detail of that personnel , we need second param is for checking fields match between Pandore and Tempo
                                this.insertPersonnelData( personnel.data[0] , this.fieldMatchPendoreTempo )
                            } )
                            .catch( () => {
                                proced.logg("Can not retrieve peronnels data")         
                                config.sendMail({
                                    subject: `Pandore import problem: ${moment().format('YYYY-MM-DD')}`,
                                    html: "Can not retrieve peronnels data from API"
                                })            
                                config.closeConnection()
                            } )            
                })

            } )

            .catch( errMsg => {
                // Happen when cant connect to API or No contrat in selected date
                proced.logg(errMsg)
                config.sendMail({
                    subject: `Pandore import ${errMsg} : ${moment().format('YYYY-MM-DD')}`,
                    html: errMsg
                }) 
                config.closeConnection()
            } )    
    }
    // End runImport
    
}
// End Class

const processing = new ImportData()
processing.runImport(selectDate)