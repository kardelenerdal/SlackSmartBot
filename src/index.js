/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const axios = require('axios')
const { Configuration, OpenAIApi } = require("openai");

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')

initializeApp();

exports.Cloudy = async(req, res) => {

  res.status(200).send('OK');
 
  if (!req.body.event.subtype ||  req.body.event.subtype !== "bot_message") {

    try {
      
      const db = getFirestore();  
      const requestsCollection = db.collection('requests');

      const query = requestsCollection.where('prompt', '==', req.body.event.text);
      const queryResults = await query.get();

      if(!queryResults.empty) {

        let outgoingText = "";

        outgoingText += "This answer has been obtained by previous responses. If you want to see another answer, please slightly change the prompt.\n\n"
        queryResults.forEach((doc) => {

          outgoingText += doc.data().response + "\n";

        })

        slackReq = {
          method : 'POST',
          url : "INCOMING-WEBHOOK-URL-OF-YOUR-CHANNEL",
          data: {
            
            "text": outgoingText
          }, 
          headers : {
            'content-type' : 'application/json',
            'accept' : '/',
            
          }
        };
        await axios(slackReq);

      } else {

        const configuration = new Configuration({
          apiKey: "YOUR-OPENAI-API-KEY",
        });
        const openai = new OpenAIApi(configuration);
        
        const result = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: req.body.event.text,
          max_tokens: 2048,
          temperature: 0,
          n:1
        });

        slackReq = {
          method : 'POST',
          url : "INCOMING-WEBHOOK-URL-OF-YOUR-CHANNEL",
          data: {
            
            "text": result.data.choices[0].text
          }, 
          headers : {
            'content-type' : 'application/json',
            'accept' : '/',
          }
        };
        await axios(slackReq);

        const data = {
          prompt: req.body.event.text,
          response: result.data.choices[0].text
        };

        requestsCollection.add(data);
      }

    } catch (error) {

        console.log(error);  
        res.send(error) 
    }
  } else {
    
  }
};
