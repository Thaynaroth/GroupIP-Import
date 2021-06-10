const config = require('./config')
const moment = require('moment')
const mysql = require('mysql')
const fs = require('fs')

const proced = {

    loadPersonnels : new Promise(function(resolve, reject) {
        const selectAllNumSecu = `SELECT per_numSecu from personnel`
        config.connection.query(selectAllNumSecu, function(err, numSecuList) {  
            if(err){ reject("Can not connect to database."); return; } 
            resolve(numSecuList);    
        }); 
    })
    
    ,

    readJSON: readJSON = (fileName) => {
        return new Promise( resolve => {
           resolve(JSON.parse( fs.readFileSync(fileName, 'utf8')))
        }) 
    }   
    ,

    logg: logg = (string) => {
        const logging = new Promise(resolve => {
            const fileName = moment().format('YYYY-MM-DD') + ".txt"
            var logger = fs.createWriteStream(`logs/${fileName}`, {flags: 'a'})
            logger.write(`${string}\n`)
            logger.end();  
            resolve(string)  
        })
        
        logging
            .then((text) => console.log(text))
           
    }
    
    ,

    insertBasicPersonnelInfo: insertBasicPersonnelInfo = (personnel) => {
        return new Promise( (resolve,reject) => {
            const personnelInsertQuery = `INSERT INTO personnel( per_nom, per_prenom,per_codePostal,per_mail,per_ville, per_nationalite , per_numSecu , per_dateNaissance , ID_Categorie) 
            VALUES ("${personnel.Nom} ${personnel.NomSuite}","${personnel.Prenom}","${personnel.AdresseCodePostal}","${personnel.Email}","${personnel.AdresseVille}", "${personnel.TxtNationalite}" , "${personnel.NumeroSecu}" , "${personnel.DateNaissance}", 4)`
            config.connection.query(personnelInsertQuery,  function(err, results) {   
                    if (err){ reject(err); return; }
                    logg(`> ${personnel.Nom} ${personnel.NomSuite} - ${personnel.NumeroSecu} , inserted`);  
                    resolve(results)                          
            });    
        } ) 
    }

    ,

    insertOtherInfo: insertOtherInfo = (tabCarte , personnelId , foundMatch) => {
        return new Promise( (resolve, reject) => {
    
                let pef_date = tabCarte.DateDebut, pef_dateEcheance = tabCarte.DateFin
                if(tabCarte.DateDebut.length > 0) pef_date = moment(tabCarte.DateDebut).format('yyyy-MM-DD')
                if(tabCarte.DateFin.length > 0)  pef_dateEcheance = moment(tabCarte.DateFin).format('yyyy-MM-DD')
                
                // if Date empty must be null value, Empty will not insert
                pef_dateEcheance = pef_dateEcheance || null;
                let insertQueryTypebase = "";

                switch (foundMatch.type) {
                    case "formation":
                        insertQueryTypebase = `INSERT INTO personnel_formation(ID_Formation, ID_Personnel, pef_date, pef_dateEcheance) 
                                        VALUES (${foundMatch.ID}, ${personnelId} , ${mysql.escape(pef_date)}, ${mysql.escape(pef_dateEcheance)})`
                        break;
                    case "habilitation":
                        insertQueryTypebase = `INSERT INTO personnel_habilitation( ID_Habilitation, ID_Personnel, peh_fin ) 
                                        VALUES (${foundMatch.ID},${personnelId}, ${mysql.escape(pef_dateEcheance)})`
                        break;
                    case "medical":
                        insertQueryTypebase = `INSERT INTO visite_medicale( ID_Type_Visite_Médicale, ID_Personnel, vis_date , vis_fin ) 
                                VALUES (${foundMatch.ID}, ${personnelId} , ${mysql.escape(pef_date)}, ${mysql.escape(pef_dateEcheance)})`
                        break;

                    default:
                        // acces
                        insertQueryTypebase = `INSERT INTO personnel_acces( ID_Acces, ID_Personnel, acc_dateCreation, acc_dateEcheance , acc_designation) 
                                        VALUES (${foundMatch.ID}, ${personnelId} , ${mysql.escape(pef_date)}, ${mysql.escape(pef_dateEcheance)} , "${foundMatch.fullName}")`
                        break;
                }
    
                
                config.connection.query(insertQueryTypebase,  function(err, results) {   
                        if (err){ reject(err); return;}
                        resolve(results)
                });
        } )
    }


}


module.exports = proced