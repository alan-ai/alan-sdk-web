const express = require('express');
const {
    check
} = require('express-validator');

const router = express.Router();

const userControllers = require('../controllers/userControllers');


router.post(
    '/doctor/:type',
    userControllers.creatUser
);
router.post(
    '/family-doctor',
    userControllers.addFamilyDoctor
);
router.post(
    '/family-doctor-remove',
    userControllers.addFamilyDoctorRemove
);
router.get(
    '/doctors',
    userControllers.getAllDoctors
);
router.get(
    '/doctors/:id',
    userControllers.getDoctor
);
router.get(
    '/patient',
    userControllers.getPatient
);


module.exports = router;