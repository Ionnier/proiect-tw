const express = require('express')
const router = express.Router()
const client = require("../db").db
// const authController = require('../controllers/authController');
// router.post('/', async (req, res) => {
//     const product = req.body;
//     res.json(await controller.addProduct(product));
// })
// router.post('/consumed', authController.protect, async (req, res, next) => {
//     try {
//         await consumtionController.addConsumedProduct(req.user, req.body)
//         res.status(200).json({ "success": "true" })
//     } catch (err) {
//         next(err);
//     }
// })
router.post('/', (req, res, next)=>{
    if(req.body.id && req.body.continut){
        let sql = "INSERT INTO public.comentarii (id_postare, continut) VALUES($1, $2)"
        client.query(sql, [req.body.id, req.body.continut], (err, data) => {
            if (err) {
                next(err)
            } else {
                res.status(200).json({ "success": "true" })
                return
            }
        })
    } 
})
module.exports = router