const express = require('express');
const {
    check
} = require('express-validator');

const router = express.Router();

const appointmentControllers = require('../controllers/appointment-controllers');

router.post(
    '/:patientDoctor',
    // [
    //     check('title')
    //     .not()
    //     .isEmpty(),
    //     check('description').isLength({
    //         min: 5
    //     }),
    //     check('address')
    //     .not()
    //     .isEmpty()
    // ],
    appointmentControllers.creatAppointment
);

router.get(
    '/doctors/:doctor',
    appointmentControllers.getDoctorAppointment
);
router.get(
    '/patient',
    appointmentControllers.getPatientAppointment
);


module.exports = router;