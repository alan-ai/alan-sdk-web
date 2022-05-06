// Created Data................
onCreateUser(p => {
    p.userData.doctorsMap = {};
    p.userData.patient = {};
    p.userData.isFormOpen = false;
    p.userData.askedForAppt = false;
    p.userData.title = '';
    p.userData.familyDoctor = '';
    p.userData.currPage = '';
    p.userData.doctorsPage = '';
    p.userData.doctorPicked = '';
    p.userData.doctorTypeDate = '';
    p.userData.doctorTypeTime = '';
    p.userData.my = 'my';
    p.userData.places = 'doctor|office|clinic|location|doctors|offices|clinics|locations';
    p.userData.distance = 'closest~closest|closer~closest|near~closest|near by~closest|close~closest|nearest~closest';
    p.userData.myDoctor = 'family~Internal Medicine|family doctors~Internal Medicine|family doctor~Internal Medicine|Internal Medicine Practitioners~Internal Medicine|family Practitioners~Internal Medicine';
    p.userData.doctorTypes = 'family~Internal Medicine|family doctors~Internal Medicine|family doctor~Internal Medicine|Internal Medicine Practitioners~Internal Medicine|family Practitioners~Internal Medicine';
    p.userData.pages = 'home~home|home page~home|landing~home|landing page~home|profile~profile|profile page~profile|my profile~profile|my profile page~profile|all doctors~doctors|all doctors page~doctors|doctors list~doctors|doctors list page~doctors|doctors~doctors|doctors page~doctors';
});
onVisualState((p, data) => {
    p.userData.isFormOpen = data.isFormOpen;
    if (data.doctorsData && data.doctorsData.length > 0) {
        let arr = [];
        data.doctorsData.map(doctor => {
            arr.push(`${doctor.name}~doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}
                     |${doctor.name} page~doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}
                     |${doctor.lastName}~doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}
                     |${doctor.lastName} page~doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}
                     |${doctor.name+" "+doctor.lastName}~doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}
                     |${doctor.name+" "+doctor.lastName} page~doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}`);
            p.userData.doctorsMap[doctor.name] = `doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}`;
            p.userData.doctorsMap[doctor.lastName] = `doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}`;
            p.userData.doctorsMap[doctor.name + " " + doctor.lastName] = `doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}`;
            p.userData.doctorsMap[`doctors/${doctor._id}`] = `${doctor.type}`;
            if (data.currDoctor && data.currDoctor === doctor._id) {
                p.userData.doctorPicked = `doctors/${doctor._id}#${doctor.name+" "+doctor.lastName}`;
            }
            if (data.currPatient) {
                p.userData.patient = data.currPatient;
            }
            if ((data.currPatient && data.currPatient.familyDoctor) ||
                (data.currPatient && data.currPatient.familyDoctor && data.currPatient.familyDoctor._id === doctor._id)
            ) {
                p.userData.familyDoctor = `doctors/${data.currPatient.familyDoctor._id}#${data.currPatient.familyDoctor.name+" "+data.currPatient.familyDoctor.lastName}`;
            } else {
                p.userData.familyDoctor = "";
            }
        })
        p.userData.doctorsPage = arr.join('|') + "|";
    }
    if (data.currPage) {
        p.userData.currPage = data.currPage.slice(1);
    }
    if (data.doctorTypes) {
        p.userData.doctorTypes = p.userData.doctorTypes.en + "|" + Object.keys(data.doctorTypes).map(type => `${type}~${type}|${type} doctor~${type}`).join('|');
    }
    if (data.appointmentRequest) {
        p.userData.askedForAppt = true;
    }
    if (data.title) {
        p.userData.title = data.title;
    }
});
// General Knowledge Of The APP................
const What_I_DO_HERE = [
    'how can you help me',
    'who are you',
    'can you help me',
]
intent(What_I_DO_HERE, p => {
    p.play('I am Alan your voice assistant, ask me question and directions, like, who are the available doctors?',
        'I help you to book your appointment smoothly, who is the doctor you want your appointment with?',
        'I am here to help you with your appointment, ask me to make an appointment');
});
const WHAT_IS_THIS = [
    'This is an appointment app, and I am Alan your voice assistant',
    'what is this app',
    'you are here to book your an appointment with your doctor',
    'how can you help me',
    'who are you',
    'can you help me',
]
intent(WHAT_IS_THIS, p => {
    p.play('This a voice AI here to help you book your appointment Smoothly',
        'I am you assistant to book an appointment all with your voice',
        'ask me questions like, who are the available doctors')
});
// Shows All Doctors ................
const GET_ALL_DOCTORS = [
    'who are the available doctors',
    'which doctors are available',
    'show me all the doctors',
    'available doctors',
    'show me doctors',
    'doctors',
    '(all|list of|) doctors',
    'I want to all available doctors',
    'I want to know the available doctors',
    'show me the available doctors'
]
intent(GET_ALL_DOCTORS, p => {
    p.play({
        command: "show-all-doctors"
    });
    p.play('here is the list of all doctors',
        'showig you all doctors',
        'this is the list of all available doctors', );
});
// Direct Between Pages................
const BACK_PAGE = [
    'go back',
    'take me back',
    'Previous page',
    'go to last page',
    'go to Previous page',
];
intent(BACK_PAGE, p => {
    p.play({
        command: "go-back"
    });
    p.play('going back', 'last page', 'ging to previous page');
});
const direct = (p, type) => {
    if (type === "page") {
        p.userData.doctorPicked = '';
        if (p.userData.currPage === p.PAGE.label) {
            p.play(`you are Currently on ${p.userData.currPage} page`,
                `you are on ${p.userData.currPage} page`,
                `you are already here`);
        } else {
            p.userData.currPage = p.PAGE.label;
            p.play(`taking you to ${p.PAGE.label} page`,
                `directing you to ${p.PAGE.label} page`,
                `opening ${p.PAGE.label} page`);
            setTimeout(() => {
                p.play({
                    command: "change_Page",
                    type,
                    link: p.PAGE.label === "home" ? "" : p.PAGE.label
                });
            }, 1500);
        }
    } else if (type === "doctor-page-1") {
        const page = p.PAGE.label.split('#');
        p.userData.doctorPicked = p.PAGE.label;
        if (p.userData.currPage === p.PAGE.label) {
            p.play(`you are Currently on doctor ${page[1]} page`,
                `you are on doctor ${page[1]} page`,
                `you are on already here`);
        } else {
            if (p.userData.askedForAppt) {
                p.userData.askedForAppt = false;
                p.userData.currPage = p.PAGE.label;
                askForAppointment(p, "doctor-appointment-1");
            } else {
                p.userData.currPage = p.PAGE.label;
                p.play(`taking you to doctor ${page[1]} page`,
                    `directing you to doctor ${page[1]} page`,
                    `opening doctor ${page[1]} page`);
                setTimeout(() => {
                    p.play({
                        command: "change_Page",
                        type,
                        link: page[0],
                        name: page[1]
                    });
                }, 1500);
            }
        }
    } else if (type === "doctor-page-2") {
        const page = p.userData.doctorsMap[p.NAME.value].split('#');
        p.userData.doctorPicked = p.userData.doctorsMap[p.NAME.value];
        if (p.userData.currPage === p.PAGE.label) {
            p.play(`you are Currently on doctor ${page[1]} page`,
                `you are on doctor ${page[1]} page`,
                `you are on already here`);
        } else {
            p.userData.currPage = p.userData.doctorsMap[p.NAME.value];
            p.play(`taking you to doctor ${page[1]} page`,
                `directing you to doctor ${page[1]} page`,
                `opening doctor ${page[1]} page`);
            setTimeout(() => {
                p.play({
                    command: "change_Page",
                    type,
                    link: page[0],
                    name: page[1]
                });
            }, 1500);
        }
    } else if (type === "type-doctor-page") {
        if (p.TYPE.label === "Internal Medicine") {
            p.play({
                command: "show-all-doctors",
                filter: ["type", 'Internal Medicine']
            });
            p.play(`these are the available family Practitioners`,
                `this is the list of family Practitioners`,
                `showing family Practitioners`);
            const page = p.userData.familyDoctor.split('#')
            if (page[1] && page[1] !== "") {
                p.play(`also, doctor ${page[1]} has been assigned as your family doctor`,
                    `letting you know, doctor ${page[1]} is your current family doctor`,
                    `dont forget, Currently, doctor ${page[1]} is your family practitioner`,
                );
            }
        } else {
            p.play(`these are the available $(p.TYPE.label+s)`,
                `this is the list for $(p.TYPE.label+s)`,
                `showing $(p.TYPE.label+s) `);
            p.play({
                command: "show-all-doctors",
                filter: ["speciality", p.TYPE.label]
            });
        }
        if (p.userData.doctorTypeTime !== "") {
            if (!p.userData.isFormOpen) {
                setTimeout(() => {
                    askForAppointment(p, "doctor-appointment-1");
                }, 4500);
            } else {
                setTimeout(() => {
                    p.play(`${p.userData.doctorTypeDate}`,
                        `moving to ${p.userData.doctorTypeDate}`,
                        `here is ${p.userData.doctorTypeDate}`);
                    p.play({
                        command: "date",
                        date: p.userData.doctorTypeDate
                    });
                }, 3000);
            }
            setTimeout(() => {
                p.play(`looking into slots`);
                p.play({
                    command: "time",
                    time: p.userData.doctorTypeTime,
                    side: "start"
                });
                p.userData.doctorTypeTime = "";
                p.userData.doctorTypeDate = "";
            }, 8500);
        }
    } else if (type === "who-is-my-doctor") {
        if (p.TYPE.label === "Internal Medicine") {
            const page = p.userData.familyDoctor.split('#');
            if (!page[1] || page[1] === "") {
                p.play('you have not picked a doctor as your family doctor yet',
                    'Currently, you do not have any family doctor',
                    'you need to assign a family doctor first');
                p.play({
                    command: "show-all-doctors",
                    filter: ["type", "Internal Medicine"]
                });
                p.play('these are the available (internal medicine practitioner|family doctors)',
                    'this is the list of (internal medicine practitioner|family doctors)',
                    'please choose a (internal medicine practitioner|family doctors)');
            } else {
                p.userData.doctorPicked = p.userData.familyDoctor;
                if (p.userData.currPage === page[0]) {
                    p.play(`doctor ${page[1]} is your internal medicine practitioner Currently`,
                        `you are on doctor ${page[1]} page, who is your family doctor`);
                } else if (p.userData.currPage === 'profile') {
                    p.play({
                        command: "family-doctor-highlight-profile",
                    });
                    p.play(`doctor ${page[1]} is your (family doctor|family practitioner)`);
                    p.play(`do you want me to redirect you to doctor ${page[1]} profile?`);
                    p.then(getBooleanAnswer, {
                        state: {
                            page: page[1],
                            link: page[0]
                        }
                    });
                } else {
                    p.play(`your family doctor, doctor ${page[1]}`,
                        `directing you to your family doctor, doctor ${page[1]}`,
                        `opening your family doctor page, doctor ${page[1]}`);
                    p.play({
                        command: "change_Page",
                        type: "doctor-page-2",
                        link: page[0]
                    });
                }
                if (p.userData.doctorTypeTime !== "") {
                    if (!p.userData.isFormOpen) {
                        setTimeout(() => {
                            askForAppointment(p, "doctor-appointment-1");
                        }, 4500);
                    } else {
                        setTimeout(() => {
                            p.play(`${p.userData.doctorTypeDate}`,
                                `moving to ${p.userData.doctorTypeDate}`,
                                `here is ${p.userData.doctorTypeDate}`);
                            p.play({
                                command: "date",
                                date: p.userData.doctorTypeDate
                            });
                        }, 3000);
                    }
                    setTimeout(() => {
                        p.play(`looking into slots`);
                        p.play({
                            command: "time",
                            time: p.userData.doctorTypeTime,
                            side: "start"
                        });
                        p.userData.doctorTypeTime = ""
                        p.userData.doctorTypeDate = ""
                    }, 9000);
                }
            }
        }
    }
}
let getBooleanAnswer = context(() => {
    intent('(yes|sure|definitely) (please|)', p => {
        p.play(`your family doctor, doctor ${p.state.page}`,
            `directing you to your family doctor, doctor ${p.state.page}`,
            `opening your family doctor page, doctor ${p.state.page}`);
        p.play({
            command: "change_Page",
            type: "doctor-page-2",
            link: p.state.link
        });
    });
});
const CHANGE_PAGE = [
    'go to $(PAGE p:pages) (please|)',
    'take me to $(PAGE p:pages) (please|)',
    'I want to check $(PAGE p:pages) (please|)',
    'show me $(PAGE p:pages) (please|)',
    '$(PAGE p:pages) (please|)',
];
intent(CHANGE_PAGE, p => {
    direct(p, "page");
});
const WHO_IS_MY_DOCTOR_TYPE = [
    'who is my $(TYPE p:doctorTypes) (please|)',
    'take me to my $(TYPE p:doctorTypes) (page|profile|) (please|)',
    'I want to check my $(TYPE p:doctorTypes) (page|profile|) (please|)',
    'show me my $(TYPE p:doctorTypes) (page|profile|) (please|)',
    'my $(TYPE p:doctorTypes) (page|profile|)(please|)',
];
intent(WHO_IS_MY_DOCTOR_TYPE, p => {
    direct(p, "who-is-my-doctor");
});
const GO_TYPE_DOCTOR_PAGE = [
    'who are (all|every|a|) (the|) $(TYPE p:doctorTypes) (page|profile|list|) (please|)',
    'take me to $(TYPE p:doctorTypes) list (please|)',
    'I want to (check|see) (all|every|a|) $(TYPE p:doctorTypes) (page|profile|list|) (please|)',
    'show me (all|every|a|) $(TYPE p:doctorTypes) (page|profile|list|) (please|)',
    '(all|every|a|) (available|) $(TYPE p:doctorTypes) (please|)',
    'I am looking for (a|) $(TYPE p:doctorTypes)'
];
intent(GO_TYPE_DOCTOR_PAGE, p => {
    direct(p, "type-doctor-page");
});
const GO_DOCTOR_PAGE_1 = [
    'go to (doctor|) $(PAGE p:doctorsPage) (please|)',
    'take me to (doctor|) $(PAGE p:doctorsPage) (please|)',
    'I want to check (doctor|) $(PAGE p:doctorsPage) (please|)',
    'show me (doctor|) $(PAGE p:doctorsPage) (please|)',
    '(doctor|) $(PAGE p:doctorsPage) (please|)',
    'I am looking for (doctor|) $(PAGE p:doctorsPage)',
    'Is there any (doctor|) $(PAGE p:doctorsPage)',
    '(doctor|)$(PAGE p:doctorsPage)',
    'I am looking for (doctor|) $(PAGE p:doctorsPage)'
];
intent(GO_DOCTOR_PAGE_1, p => {
    direct(p, "doctor-page-1");
});
const GO_DOCTOR_PAGE_2 = [
    'go to (doctor|) $(NAME) page (please|)',
    'take me to (doctor|) $(NAME) page (please|)',
    'I want to check (doctor|) $(NAME) page (please|)',
    'show me (doctor|) $(NAME) page (please|)',
    '(doctor|) $(NAME) page (please|)',
    'I am looking for (doctor|) $(NAME)',
    'Is there any (doctor|) $(NAME)',
    'doctor $(NAME)',
    'doctor $(NAME) page',
    'I am looking for (doctor|) $(NAME)',
    'I am looking for (doctor|) $(NAME) page'
];
intent(GO_DOCTOR_PAGE_2, p => {
    if (!p.userData.doctorsMap[p.NAME.value]) {
        p.userData.doctorPicked = '';
        p.play(`doctor ${p.NAME.value} is not one of our doctors`,
            `doctor ${p.NAME.value} is not in our system`,
            `doctor ${p.NAME.value} is not available`,
            `I can not find doctor ${p.NAME.value}`);
    } else {
        direct(p, "doctor-page-2");
    }
});
// Make Appointment ................
const askForAppointment = (p, type) => {
    if (type === "doctor-appointment") {
        if ((p.userData.currPage && p.userData.currPage.split('/').length < 2) || p.userData.doctorPicked === "") {
            p.userData.askedForAppt = true;
            p.play({
                command: "show-all-doctors"
            });
            p.play('here is the list of all doctors, who do you have in mind?',
                'you need to pick a doctor first.',
                'let me know who do you want your appointment with.');
        } else {
            const page = p.userData.currPage !== '' && p.userData.currPage.split('#').length > 1 ? p.userData.currPage.split('#') : p.userData.doctorPicked.split('#')
            p.play({
                command: "open-appointment-form",
                link: page[0],
                name: page[1],
            });
            p.play(`(here|this) is doctor ${page[1]} appointment form`,
                `doctor ${page[1]} appointment form`,
                `this is the form of doctor ${page[1]} available slots`,
                `these are doctor ${page[1]} available slots`);
        }
    } else if (type === "doctor-appointment-1") {
        const page = p.PAGE ? p.PAGE.label.split('#') : p.userData.familyDoctor.split('#');
        p.play({
            command: "create-appointment",
            link: page[0],
            name: page[1],
        });
        p.play(`(here|this) is doctor ${page[1]} appointment form`,
            `doctor ${page[1]} appointment form`,
            `this is the form of doctor ${page[1]} available slots`,
            `these are doctor ${page[1]} available slots`);
    } else if (type === "doctor-appointment-2") {
        const page = p.userData.doctorsMap[p.NAME.value].split('#');
        p.userData.doctorPicked = p.userData.doctorsMap[p.NAME.value];
        p.play({
            command: "create-appointment",
            link: page[0],
            name: page[1],
        });
        p.play(`(here|this) is doctor ${page[1]} appointment form`,
            `doctor ${page[1]} appointment form`,
            `this is the form of doctor ${page[1]} available slots`,
            `these are doctor ${page[1]} available slots`);
    }
}
const ASK_FOR_APPOINTMENT = [
    'appointment (please|)',
    'I want (an|my|) appointment (please|)',
    '(make|have|create) (an|) appointment (please|)',
    'I want (an|my|) to (make|have|create) appointment (please|)',
    'I would Like (an|) appointment (please|)',
    'I would Like to (make|have|create) (an|) appointment (please|)',
    'I need (an|my|) appointment (please|)',
    'I need to (make|have|create) (an|my|) appointment (please|)',
    '(please|) make (an|my|) appointment (please|)',
    '(please|) create (an|my|) appointment (please|)',
]
intent(ASK_FOR_APPOINTMENT, p => {
    if (p.userData.doctorPicked === '' || p.userData.currPage === '') {
        p.userData.askedForAppt = true;
        p.userData.currPage = "doctors";
        p.play({
            command: "show-all-doctors"
        });
        p.play('here is the list of all doctors, who do you have in mind?',
            'this is the doctors list, who do you want your appointment with?',
            'let me know who do you want your appointment with.');
    } else {
        askForAppointment(p, "doctor-appointment");
    }
});
const ASK_FOR_DOCTOR_APPOINTMENT_2 = [
    'appointment with (doctor|) $(NAME) (please|)',
    'I want (an|my|) appointment with (doctor|) $(NAME) (please|)',
    '(make|have|create) appointment with (doctor|) $(NAME) (please|)',
    'I want (an|my|) to (make|have|create) appointment with (doctor|) $(NAME) (please|)',
    'I would Like (an|my|) appointment with (doctor|) $(NAME) (please|)',
    'I would Like to (make|have|create) (an|my|) appointment with (doctor|) $(NAME) (please|)',
    'I need (an|my|) appointment with (doctor|) $(NAME) (please|)',
    'I need to (make|have|create) (an|my|) appointment with (doctor|) $(NAME) (please|)',
    '(please|) make (an|my|) appointment with (doctor|) $(NAME) (please|)',
    '(please|) create (an|my|) appointment with (doctor|) $(NAME) (please|)',
]
intent(ASK_FOR_DOCTOR_APPOINTMENT_2, p => {
    if (!p.userData.doctorsMap[p.NAME.value]) {
        p.userData.doctorPicked = '';
        p.play(`doctor ${p.NAME.value} is not one of our doctors`,
            `doctor ${p.NAME.value} is not in our system`,
            `doctor ${p.NAME.value} is not available`,
            `I can not find doctor ${p.NAME.value}`);
        p.userData.askedForAppt = true;
        p.play({
            command: "show-all-doctors"
        });
        p.play('here is the list of available doctors',
            'pick one of the available doctors from this list',
            'please find an available doctor');
    } else {
        askForAppointment(p, "doctor-appointment-2");
    }
})
const ASK_FOR_DOCTOR_APPOINTMENT_3 = [
    '(lets|please|) change the date to $(TIME)  $(DATE) (please|)',
    '(lets|please|) change the date to $(DATE) $(TIME) (please|)',
    ' (please|) (make|have|create|) (I want|) (an|my|) (appointment|) (for|) $(TIME)  $(DATE) (please|)',
    'I want (an|my|) to (make|have|create|) appointment (for|) $(TIME)  $(DATE) (please|)',
    'I would Like (an|my|) appointment (for|) $(TIME) $(DATE) (please|)',
    'I would Like to (make|have|create|) (an|my|) appointment (for|) $(TIME)  $(DATE) (please|)',
    ' (please|) (make|have|create|) (I want|) (an|my|) (appointment|) (for|)  $(DATE)  $(TIME)(please|)',
    'I want (an|my|) to (make|have|create) appointment (for|) $(DATE) $(TIME) (please|)',
    'I would Like (an|my|) appointment (for|) $(DATE) $(TIME) (please|)',
    'I would Like to (make|have|create) (an|my|) appointment (for|)  $(DATE) $(TIME) (please|)',
    'appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    'I want (an|my|) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    '(make|have|create) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    'I want (an|my|) to (make|have|create) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    'I would Like (an|my|) appointment with (doctor|) $(NAME) (for|) $(TIME) $(DATE) (please|)',
    'I would Like to (make|have|create) (an|my|) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    'I need (an|my|) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    'I need to (make|have|create) (an|my|) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    '(please|) make (an|my|) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    '(please|) create (an|my|) appointment with (doctor|) $(NAME) (for|) $(TIME)  $(DATE) (please|)',
    'appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    'I want (an|my|) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    '(make|have|create) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    'I want (an|my|) to (make|have|create) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    'I would Like (an|my|) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    'I would Like to (make|have|create) (an|my|) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    'I need (an|my|) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    'I need to (make|have|create) (an|my|) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    '(please|) make (an|my|) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
    '(please|) create (an|my|) appointment with (doctor|) $(NAME) (for|) $(DATE) $(TIME) (please|)',
]
intent(ASK_FOR_DOCTOR_APPOINTMENT_3, p => {
    if (p.NAME && p.NAME.value) {
        if (!p.userData.doctorsMap[p.NAME.value]) {
            p.userData.doctorPicked = ''
            p.play(`doctor ${p.NAME.value} is not one of our doctors`,
                `doctor ${p.NAME.value} is not in our system`,
                `doctor ${p.NAME.value} is not available`,
                `I can not find doctor ${p.NAME.value}`);
            p.userData.askedForAppt = true;
            p.play({
                command: "show-all-doctors"
            });
            p.play('here is the list of available doctors',
                'pick one of the available doctors from this list',
                'please find an available doctor');
        } else {
            if (!p.userData.isFormOpen) {
                askForAppointment(p, "doctor-appointment-2");
            }
            setTimeout(() => {
                p.play(`${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                    `moving to ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                    `here is ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`);
                p.play({
                    command: "date",
                    date: p.DATE.moment
                });
            }, 1000);
            setTimeout(() => {
                p.play(`looking into slots`)
                p.play({
                    command: "time",
                    time: p.TIME.value,
                    side: "start"
                });
            }, 5500);
        }
    } else {
        if (!p.userData.isFormOpen) {
            askForAppointment(p, "doctor-appointment");
        }
        setTimeout(() => {
            p.play(`${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                `moving to ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                `here is ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`);
            p.play({
                command: "date",
                date: p.DATE.moment
            });
        }, 1000)
        setTimeout(() => {
            p.play(`looking into slots`);
            p.play({
                command: "time",
                time: p.TIME.value,
                side: "start"
            });
        }, 5500);
    }
});
intent(ASK_FOR_DOCTOR_APPOINTMENT_3, p => {
    if (p.NAME && p.NAME.value) {
        if (!p.userData.doctorsMap[p.NAME.value]) {
            p.userData.doctorPicked = '';
            p.play(`doctor ${p.NAME.value} is not one of our doctors`,
                `doctor ${p.NAME.value} is not in our system`,
                `doctor ${p.NAME.value} is not available`,
                `I can not find doctor ${p.NAME.value}`);
            p.userData.askedForAppt = true;
            p.play({
                command: "show-all-doctors"
            });
            p.play('here is the list of available doctors',
                'pick one of the available doctors from this list',
                'please find an available doctor');
        } else {
            if (!p.userData.isFormOpen) {
                askForAppointment(p, "doctor-appointment-2");
            }
            setTimeout(() => {
                p.play(`${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                    `moving to ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                    `here is ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`);
                p.play({
                    command: "date",
                    date: p.DATE.moment
                });
            }, 1000);
            setTimeout(() => {
                p.play(`looking into slots`);
                p.play({
                    command: "time",
                    time: p.TIME.value,
                    side: "start"
                });
            }, 5500);
        }
    } else {
        setTimeout(() => {
            p.play(`${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                `moving to ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
                `here is ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`);
            p.play({
                command: "date",
                date: p.DATE.moment
            });
        }, 1000);
        setTimeout(() => {
            p.play(`looking into slots`);
            p.play({
                command: "time",
                time: p.TIME.value,
                side: "start"
            })
        }, 5500);
    }
});
const ASK_FOR_DOCTOR_APPsOINTMENT_4 = [
    'appointment with  $(MY p:my) $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    'I want (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    '(make|have|create) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    'I want (an|) to (make|have|create) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    'I would Like (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME) $(DATE) (please|)',
    'I would Like to (make|have|create) (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    'I need (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    'I need to (make|have|create) (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    '(please|) make (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(TIME)  $(DATE) (please|)',
    '(please|) create (an|) appointment with $(MY p:my)  $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    'appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    'I want (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    '(make|have|create) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    'I want (an|) to (make|have|create) appointment with $(MY p:my) $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    'I would Like (an|) appointment with $(MY p:my)  $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    'I would Like to (make|have|create) (an|) appointment with $(MY p:my) $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    'I need (an|) appointment with $(MY p:my) $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    'I need to (make|have|create) (an|) appointment with $(MY p:my) $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    '(please|) make (an|) appointment with $(MY p:my) $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    '(please|) create (an|) appointment with $(MY p:my) $(TYPE p:myDoctor) (for|) $(DATE) $(TIME) (please|)',
    'appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    'I want (an|) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    '(make|have|create) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    'I want (an|) to (make|have|create) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    'I would Like (an|) appointment with $(TYPE p:doctorTypes) (for|) $(TIME) $(DATE) (please|)',
    'I would Like to (make|have|create) (an|) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    'I need (an|) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    'I need to (make|have|create) (an|) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    '(please|) make (an|) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    '(please|) create (an|) appointment with $(TYPE p:doctorTypes) (for|) $(TIME)  $(DATE) (please|)',
    'appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    'I want (an|) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    '(make|have|create) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    'I want (an|) to (make|have|create) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    'I would Like (an|) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    'I would Like to (make|have|create) (an|) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    'I need (an|) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    'I need to (make|have|create) (an|) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    '(please|) make (an|) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
    '(please|) create (an|) appointment with $(TYPE p:doctorTypes) (for|) $(DATE) $(TIME) (please|)',
]
intent(ASK_FOR_DOCTOR_APPsOINTMENT_4, p => {
    p.userData.doctorTypeDate = `${p.DATE.moment.format("dddd, MMMM Do YYYY")}`;
    p.userData.doctorTypeTime = `${p.TIME.value}`;
    if (p.MY && p.MY.value) {
        direct(p, "who-is-my-doctor");
    } else {
        direct(p, "type-doctor-page");
    }
})
// Event Form ................
const CLOSE_FORM = [
    'close (the|this|appointment|) (tab|event form|form|) (please|)',
    'I want to close the tap',
];
intent(CLOSE_FORM, p => {
    if (!p.userData.isFormOpen) {
        p.play('no form is open',
            'there is no form to close');
    } else {
        p.play({
            command: "close-form"
        });
        p.play(`closing the tab for doctor ${p.userData.doctorPicked.split("#")[1]} appointment`,
            `closing the event form for doctor ${p.userData.doctorPicked.split("#")[1]}`);
    }
});
const OPEN_FORM = [
    'open (the|this|appointment|) (tab|event form|form|) (please|)',
    'I want to open the tap',
    'open the tap'
];
intent(OPEN_FORM, p => {
    if (p.userData.isFormOpen) {
        p.play(`Event form is already open for doctor ${p.userData.doctorPicked.split("#")[1]}`)
    } else {
        if (p.userData.doctorPicked !== '') {
            p.play({
                command: "open-form"
            });
            p.play('opening the tab',
                'opening the event form',
                'open the form');
        } else {
            p.play('you have not chosen any doctor yet',
                'please pick your doctor first');
        }
    }
});
const NEXT_MONTH = [
    '(go to|check) next month (please|)',
];
intent(NEXT_MONTH, p => {
    p.play({
        command: "nextMonth"
    });
    p.play('next month',
        'going next month',
        'sure');
});
const LAST_MONTH = [
    '(go to|) (last|previous) month (please|)',
];
intent(LAST_MONTH, p => {
    p.play({
        command: "backMonth"
    });
    p.play('Previous month',
        'last month',
        'sure');
});
const NEXT_YEAR = [
    '(go to|) next year (please|)',
];
intent(NEXT_YEAR, p => {
    p.play({
        command: "nextYear"
    });
    p.play('next year',
        'going next year',
        'sure');
});
const LAST_YEAR = [
    '(go to|) (last|previous) year (please|)',
];
intent(LAST_YEAR, p => {
    p.play({
        command: "backYear"
    });
    p.play('Previous year',
        'last year',
        'sure');
});
const ASK_FOR_A_DATE = [
    '(lets|please|) change the date to $(DATE)',
    '(lets|please|) look at $(DATE)',
    '(how about|check|) $(DATE)',
];
intent(ASK_FOR_A_DATE, p => {
    p.play(`${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
        `moving to ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`,
        `here is ${p.DATE.moment.format("dddd, MMMM Do YYYY")}`);
    p.play({
        command: "date",
        date: p.DATE.moment
    });
});
const SET_TITLE = [
    `(set|change|) (the|) (appointment|) title (to|is) $(TITLE* (.*)) (please|)`,
];
intent(SET_TITLE, p => {
    p.userData.title = p.TITLE.value;
    p.play({
        command: "title",
        title: p.TITLE.value
    });
    p.play(`filling the title`,
        `sure`,
        `Definitely `);
});
const SET_TIME = [
    `(lets|please|) change the time to $(TIME)`,
    `(how about|looking for|) $(SIDE start~start|end~end|left~start|right~end|from~start|to~end|) $(TIME)`,
];
intent(SET_TIME, p => {
    p.play({
        command: "time",
        time: p.TIME.value,
        side: p.SIDE.value ? p.SIDE.label : "start"
    });
});
const SAVE_APPOINTMENT = [
    `(save|submit) (the|my|) (appointment|)`,
    `I am (good|done|) with (my|) appointment`
];
intent(SAVE_APPOINTMENT, p => {
    if (p.userData.title === "") {
        p.play(`Are you ready to submit? Just letting you know that title is still empty`,
            `are you sure you want to submit this form?, the title is still empty`,
            `should I submit the form? you might want to fill the title or do any changes before moving to submission`);
    }
    p.play({
        command: "save"
    });
    p.userData.isFormOpen = false
    p.play(`saving`,
        `sure, saving the appointment`,
        `confirming your appointment`);
});
// Make my doctor ................
const MAKE_MY_DOCTOR = [
    `(I want to|) (make|pick) (him|her|) my $(TYPE p:doctorTypes)`,
    `(I want to|) (send|) $(TYPE p:doctorTypes) request`
];
intent(MAKE_MY_DOCTOR, p => {
    if (p.userData.doctorsMap[p.userData.currPage] && p.userData.doctorsMap[p.userData.currPage] === "Internal Medicine") {
        const familyDoctor = p.userData.familyDoctor === '' ? null : p.userData.familyDoctor.split('#');
        if (!familyDoctor) {
            const id = p.userData.patient._id ? p.userData.patient._id : ""
            p.play({
                command: "make-my-doctor",
                doctor: p.userData.currPage,
                patient: id
            });
            p.play(`sending your request`,
                `sure, your request has been sent`,
                `confirming your request`);
        } else {
            p.play(`you already have a family doctor assigned. You need to remove doctor ${familyDoctor[1]} as your family doctor first `);
        }
    } else {
        p.play(`you either didnt pick a doctor yet or the doctor you picked dosnt have the option to accept`);
    }
});
const REMOVE_MY_DOCTOR = [
    `(I want to|) (remove|retreat) (him|her|) (as|) my $(TYPE p:doctorTypes) (request|)`,
    `I want to retreat my request`
];
intent(REMOVE_MY_DOCTOR, p => {
    if (p.userData.doctorsMap[p.userData.currPage] && p.userData.doctorsMap[p.userData.currPage] === "Internal Medicine") {
        const familyDoctor = p.userData.familyDoctor === '' ? null : p.userData.familyDoctor.split('#');
        if (familyDoctor) {
            const id = p.userData.patient._id ? p.userData.patient._id : ""
            p.play({
                command: "remove-my-doctor",
                doctor: p.userData.currPage,
                patient: id
            });
            p.play(`sending your request`,
                `sure, your request has been sent`,
                `confirming your request`);
        } else {
            p.play(`you already have a family doctor assigned`);
        }
    } else {
        p.play(`you either didnt pick a doctor or the doctor you picked dosnt have the option to accept`);
    }
});
// Search ................
const SEARCH_APPOINTMENT = [
    `(lets|please|) change the date to $(DATE)`,
    `what are $(DATE) (appointments|appointment)`,
    `show me $(DATE) (appointments|appointment)`
];
intent(SEARCH_APPOINTMENT, p => {
    direct(p, "page");
});
const FIND_LOCATION = [
    `(the|) $(DISTANCE p:distance) $(PLACES p:places)`,
    `(search|searching|looking) for (a|an|the) $(DISTANCE p:distance) $(PLACES p:places)`,
    `(search|searching|looking) for (a|an|the) $(DISTANCE p:distance) $(PLACES p:places)`,
    `(show me|find|where|what) (is|are) (a|an|the)  $(DISTANCE p:distance) $(PLACES p:places)`,
    `(search|searching|looking) for the $(DISTANCE p:distance) $(PLACES p:places)`,
    `(the|) $(DISTANCE p:distance) $(TYPE p:doctorTypes) $(PLACES p:places)`,
    `(search|searching|looking) for (a|an|the) $(DISTANCE p:distance) $(TYPE p:doctorTypes) $(PLACES p:places)`,
    `(search|searching|looking) for (a|an|the) $(PLACES p:places) $(TYPE p:doctorTypes) $(DISTANCE p:distance)`,
    `(show me|find|where|what) (is|are) (a|an|the)  $(DISTANCE p:distance) $(TYPE p:doctorTypes) $(PLACES p:places)`,
    `(search|searching|looking) for the $(DISTANCE p:distance) $(TYPE p:doctorTypes) $(PLACES p:places)`,
];
intent(FIND_LOCATION, p => {
    if (!p.TYPE) {
        p.play({
            command: "show-all-doctors",
            sort: "closest"
        });
        p.play('here is the list of all doctors sorted by distance from you.',
            'showig doctors sorted by distance from you');
    } else {
        p.play({
            command: "show-all-doctors",
            sort: "closest",
            filter: p.TYPE.label !== "Internal Medicine" ? ["speciality", p.TYPE.label] : ["type", 'Internal Medicine']
        });
        p.play(`here is the list of all ${p.TYPE.label} doctors sorted by distance from you.`,
            `showig ${p.TYPE.label} doctors sorted by distance from you`);
    }
});
// Goodbye ................
const BYE = [
    'goodbye (Alan|)', 'I am done (Alan|)',
];
intent(BYE, p => {
    p.play(`Goodbye ${p.userData.patient.name}!`,
        `bye ${p.userData.patient.name}!`,
        `take care ${p.userData.patient.name}!`);
    setTimeout(() => {
        p.play({
            command: "goodbye"
        })
    }, 1500);
});
// Fall Backs ................
fallback('I am sorry, I did not understand you', 'please clarify, I did not undrestand what you said');