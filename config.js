const mysql = require('mysql')
const api_key = 'key-a0a2bd2925ea58ec2693acbe9fbe413f';
const domain = 'ingeris.com';
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

const config = {
    connection: connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : '',
        database : 'pandore_groupe_ip_v2a'
    })
    ,
    sendMail: sendMail = (content) => {

        let mailTo
        mailTo = "thaynaroth.chuek@sompom.com"
        // mailTo = "jeremy.mum@sompom.com"
        
        var data = {
            from: 'Ingeris@no-reply.com',
            to: mailTo,
            subject: content.subject,
            html: content.html
        };
           
        mailgun.messages().send(data, function (error, body) {
            console.log(body)
        })
    
    }
    ,
    requestOption: requestOption = (url) => {
        return {
            'method': 'GET',
            'url': url,
            'headers': {
                'Authorization': 'Basic SW50ZXJpbXF1YWxpdGU6b3ZiQWpldjZRSGZtK0doQUQrTQ=='
            }
        }
    }
    ,
    closeConnection: closeConnection = () => {
        setTimeout(()=>{
            connection.end();
            process.exit(0);
        },3000);
    }

}

module.exports = config