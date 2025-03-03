let express = require('express');
let router = express.Router();
let winston = require('../config/winston');
const { Webhook } = require('../models/webhook');
const webhookService = require('../services/webhookService');

router.post('/', async (req, res) => {

    let id_project = req.projectid;

    let webhooks = await Webhook.find({ id_project: id_project, copilot: true }).catch((err) => {
        winston.error("Error finding copilot webhooks: ", err);
        return res.status(500).send({ success: false, error: err });
    })

    let promises = webhooks.map((w) => 
        webhookService.run(w)
            .then((response) => {
                return response;
            }).catch((err) => {
                winston.error("Error running webhook: ", err);
                return null;
            })
    )

    Promise.all(promises).then((result) => {
        return res.status(200).send(result);
    }).catch((err) => {
        return res.status(500).send({ success: false, error: err });
    })

})
module.exports = router;