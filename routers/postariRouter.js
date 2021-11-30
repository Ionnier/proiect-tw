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
router.get('/', (req, res, next)=>{
    let sql = "SELECT * FROM postari;"
    client.query(sql, (err, data) => {
        if (err) {
            next(err)
        } else {
            res.status(200).json(data.rows)
            return
        }
    })
})
router.post('/', (req, res, next)=>{
    console.log("start")
    if(req.body.title && req.body.continut){
        let sql = "INSERT INTO public.postari (titlu, continut, data_publicare) VALUES($1, $2, now()) returning id_postare"
        client.query(sql, [req.body.title, req.body.continut], (err, data) => {
            console.log("emm")
            if (err) {
                console.log(err)
                next(err)
            } else {
                console.log(data)
                res.status(200).json({ "success": "true" , "id_postare": data.rows[0].id_postare})
                return
            }
        })
    } else{
        res.status(400).json({"success":"false"})
    } 
})
module.exports = router