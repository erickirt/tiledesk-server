var express = require('express');
var router = express.Router();
var Faq = require("../models/faq");
var multer = require('multer')
var upload = multer()
const faqBotEvent = require('../event/faqBotEvent');
var winston = require('../config/winston');

var parsecsv = require("fast-csv");
csv = require('csv-express');
csv.separator = ';';

// POST CSV FILE UPLOAD FROM CLIENT
router.post('/uploadcsv', upload.single('uploadFile'), function (req, res, next) {
  winston.debug(' -> -> REQ BODY ', req.body);
  winston.debug(' -> ID FAQ-KB  ', req.body.id_faq_kb);
  winston.debug(' -> DELIMITER ', req.body.delimiter);
  winston.debug(' -> FILE ', req.file);

  var id_faq_kb = req.body.id_faq_kb;
  winston.debug('id_faq_kb: '+id_faq_kb);

  var delimiter = req.body.delimiter || ";";
  winston.debug('delimiter: '+delimiter);

  var csv = req.file.buffer.toString('utf8');
  // winston.debug(' -> CSV STRING ', csv);

  // res.json({ success: true, msg: 'Importing CSV...' });

  // PARSE CSV
 

  // getFaqKbKeyById(req.body.id_faq_kb, function (remote_faqkb_key) {

    parsecsv.parseString(csv, { headers: false, delimiter: delimiter })
      .on("data", function (data) {
        winston.debug('PARSED CSV ', data);

        var question = data[0]
        var answer = data[1]
        var intent_display_name = data[2];

        var newFaq = new Faq({
          id_faq_kb: id_faq_kb,
          question: question,
          answer: answer,
          intent_display_name: intent_display_name,
          id_project: req.projectid,
          createdBy: req.user.id,
          updatedBy: req.user.id
        });

        newFaq.save(function (err, savedFaq) {
          if (err) {
            winston.error('--- > ERROR uploadcsv', err)

            // return res.status(500).send({ success: false, msg: 'Error saving object.' }); // ADDED 24 APR
          }

          faqBotEvent.emit('faq.create', savedFaq);

          // res.json({ success: true, savedFaq }); // ADDED 24 APR

          // createRemoteFaq(remote_faqkb_key, savedFaq);
          // winston.debug('ID OF THE NEW FAQ CREATED from CSV IMPORTED: ', savedFaq._id)
        });
      })
      .on("end", function () {
        winston.debug("PARSE DONE");
        res.json({ success: true, msg: 'CSV Parsed' });
      })
      .on("error", function (err) {
        winston.error("PARSE ERROR uploadcsv", err);
        res.json({ success: false, msg: 'Parsing error' });
      });
  // });
});


router.post('/', function (req, res) {

  winston.debug(req.body);
  var newFaq = new Faq({
    id_faq_kb: req.body.id_faq_kb,
    question: req.body.question,
    answer: req.body.answer,
    id_project: req.projectid,
    topic: req.body.topic,
    webhook_enabled: req.body.webhook_enabled,
    intent_display_name: req.body.intent_display_name,
    createdBy: req.user.id,
    updatedBy: req.user.id
  });

  newFaq.save(function (err, savedFaq) {
    if (err) {
      if (err.code == 11000) {
        return res.status(409).send({ success: false, msg: 'Duplicate  intent_display_name.' });
      } else {
        winston.debug('--- > ERROR ', err)
        return res.status(500).send({ success: false, msg: 'Error saving object.' });
      }     
    }
    winston.debug('1. ID OF THE NEW FAQ CREATED ', savedFaq._id)
    winston.debug('1. QUESTION OF THE NEW FAQ CREATED ', savedFaq.question)
    winston.debug('1. ANSWER OF THE NEW FAQ CREATED ', savedFaq.answer)
    winston.debug('1. ID FAQKB GET IN THE OBJECT OF NEW FAQ CREATED ', savedFaq.id_faq_kb);

    faqBotEvent.emit('faq.create', savedFaq);

    res.json(savedFaq);

  

  });
});


router.put('/:faqid', function (req, res) {

  winston.debug('UPDATE FAQ ', req.body);

  var update = {};
  
  if (req.body.intent!=undefined) {
    update.intent = req.body.intent;
  }
  if (req.body.question!=undefined) {
    update.question = req.body.question;
  }
  if (req.body.answer!=undefined) {
    update.answer = req.body.answer;
  }
  if (req.body.topic!=undefined) {
    update.topic = req.body.topic;
  }
  if (req.body.status!=undefined) {
    update.status = req.body.status;
  }
  if (req.body.language!=undefined) {
    update.language = req.body.language;
  }
  if (req.body.intent_display_name!=undefined) {
    update.intent_display_name = req.body.intent_display_name;
  }
  if (req.body.webhook_enabled!=undefined) {
    update.webhook_enabled = req.body.webhook_enabled;
  }
  


  Faq.findByIdAndUpdate(req.params.faqid, update, { new: true, upsert: true }, function (err, updatedFaq) {
    if (err) {
      if (err.code == 11000) {
        return res.status(409).send({ success: false, msg: 'Duplicate  intent_display_name.' });
      }else {
        return res.status(500).send({ success: false, msg: 'Error updating object.' });
      }
    }

    faqBotEvent.emit('faq.update', updatedFaq);

    res.json(updatedFaq);

    // updateRemoteFaq(updatedFaq)
  });
});


// DELETE REMOTE AND LOCAL FAQ
router.delete('/:faqid', function (req, res) {

  // deleteRemoteFaq(req.params.faqid)
  winston.debug('DELETE FAQ - FAQ ID ', req.params.faqid);

  Faq.remove({ _id: req.params.faqid }, function (err, faq) {
    if (err) {
      return res.status(500).send({ success: false, msg: 'Error deleting object.' });
    }
    res.json(faq);

  });


});

// EXPORT FAQ TO CSV
router.get('/csv', function (req, res) {
  var query = {};

  winston.debug('req.query', req.query);

  if (req.query.id_faq_kb) {
    query.id_faq_kb = req.query.id_faq_kb;
  }

  winston.debug('EXPORT FAQS TO CSV QUERY', query);

   Faq.find(query, 'question answer -_id').lean().exec(function (err, faq) {
    if (err) {
      winston.debug('EXPORT FAQS TO CSV ERR', err)
      return (err)
    };
    winston.debug('EXPORT FAQ TO CSV FAQS', faq)
    res.csv(faq, true)
    // res.json(faq);
  });

});


router.get('/:faqid', function (req, res) {

  winston.debug(req.body);

  Faq.findById(req.params.faqid, function (err, faq) {
    if (err) {
      return res.status(500).send({ success: false, msg: 'Error getting object.' });
    }
    if (!faq) {
      return res.status(404).send({ success: false, msg: 'Object not found.' });
    }
    res.json(faq);
  });
});



router.get('/', function (req, res, next) {
  var query = {};

  winston.debug("GET ALL FAQ OF THE BOT ID (req.query): ", req.query);

  if (req.query.id_faq_kb) {
    query.id_faq_kb = req.query.id_faq_kb;
  }

  if (req.query.text) {
    winston.debug("GET FAQ req.projectid", req.projectid);

    // query.$text = req.query.text;
    query.$text = { "$search": req.query.text };
    query.id_project = req.projectid
  }

  winston.debug("GET FAQ query", query);

  // query.$text = {"$search": "question"};

  return Faq.find(query).
  populate({path:'faq_kb'})//, match: { trashed: { $in: [null, false] } }}).
  .exec(function (err, faq) {
      winston.debug("GET FAQ ", faq);

      if (err) {
        winston.debug('GET FAQ err ', err)
        return next(err)
      };
      winston.debug('GET FAQ  ', faq)
      res.json(faq);

    });

  
});




module.exports = router;
