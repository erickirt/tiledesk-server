var express = require('express');
var router = express.Router();
var winston = require('../config/winston');
const { MessageLog } = require('../models/whatsappLog');



router.get('/', function (req, res, next) {
    winston.info("logs", req.body);
    return res.status(200).send({ success: true });
});


router.post('/', function (req, res, next) {
    winston.info("logs", req.body);
    return res.status(200).send({ success: true });
});

router.get('/whatsapp', async (req, res) => {
    res.stats(200).send({ success: true });
})


router.get('/whatsapp/:transaction_id', async (req, res) => {

    let transaction_id = req.params.transaction_id;
    winston.info("Get logs for whatsapp transaction_id " + transaction_id);;

    MessageLog.find({ transaction_id: transaction_id }).lean().exec((err, logs) => {
        if (err) {
            winston.error("Error find logs for transaction_id " + transaction_id);
            return res.status(400).send({ success: false, message: "Unable to find logs for transaction_id " + transaction_id })
        }

        winston.verbose("Logs found: ", logs);

        let clearLogs = logs.map(({_id, __v, ...keepAttrs}) => keepAttrs)
        winston.verbose("clearLogs: ", clearLogs)

        res.status(200).send(logs);
    })

})

router.post('/whatsapp', async (req, res) => {

    winston.info("save following log: ", req.body);

    let log = new MessageLog({
        json_message: req.body.json_message,
        transaction_id: req.body.transaction_id,
        message_id: req.body.message_id,
        status: req.body.status,
        status_code: req.body.status_code,
        error: req.body.error
    });

    log.save((err, savedLog) => {
        if (err) {
            winston.error("Unable to save log: ", err);
            return res.status(400).send(err);
        }

        winston.info("savedLog: ", savedLog);
        res.status(200).send(savedLog);
    })
})








module.exports = router;
