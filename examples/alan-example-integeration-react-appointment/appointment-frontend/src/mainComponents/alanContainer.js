import React, { useEffect, useContext, useRef } from "react";
import { AppointmentContext } from "../provider/provider";
import { useNavigate } from "react-router-dom";
import { browserName } from "react-device-detect";

import alanBtn from "@alan-ai/alan-sdk-web";

import axios from "axios";
import moment from "moment";

function AlanContainer() {
	const navigate = useNavigate();
	const roolElRef = useRef(null);
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist. AlanContainer");
	}
	useEffect(() => {
		window.doctorInfo = context.doctorInfo;
		window.title = context.title;
		window.doctors = context.doctors;
		window.doctorTypes = context.specialities;
		window.isFormOpen = context.adding;
		window.doctor = context.doctor;
		window.patient = context.patient;
		if (context.doctors.length > 0) {
			window.doctors = context.doctors;
		}
		if (Object.keys(context.slotsMap).length > 0) {
			window.slotsMap = context.slotsMap;
		}
		if (!window.alanBtnInstance) {
			window.alanBtnInstance = alanBtn({
				// uncomment the next line for Public repository
				// key: process.env.REACT_APP_ALAN_KEY,
				key:
					"d8c0f48264d5dad24d0bf347580da6fd2e956eca572e1d8b807a3e2338fdd0dc/prod",
				position: "absolute",
				right: "0",
				bottom: "0",
				rootEl: roolElRef.current,
				onButtonState: (e) => {
					console.log("<<========", e, "=======>>");
					if (e === "LISTEN") {
						setDoctorsState();
					}
					if (e === "ONLINE") {
						window.welcomeMsg = false;
					}
				},
				onCommand: (commandData) => {
					console.log("<<<<<++++++", commandData, "+++++++>>>>>>>");

					if (commandData.command === "goodbye") {
						stop();
					}
					if (commandData.command === "family-doctor-highlight-profile") {
						context.setIsArrowVisible(true);
					}
					if (commandData.command === "make-my-doctor") {
						sendFamilyDoctorRqst(
							commandData.patient,
							commandData.doctor.split("/")[1]
						);
						setTimeout(() => {
							playResponse(
								`doctor ${window.doctorInfo.lastName} is now your family physician`
							);
						}, 500);
					}
					if (commandData.command === "remove-my-doctor") {
						sendRemoveFamilyDoctorRqst(
							commandData.patient,
							commandData.doctor.split("/")[1]
						);
						setTimeout(() => {
							playResponse(
								`doctor ${window.doctorInfo.lastName} has been removed as your family physician`
							);
						}, 500);
					}
					if (commandData.command === "open-form") {
						context.setAdding(true);
					}
					if (commandData.command === "close-form") {
						context.setAdding(false);
					}
					if (commandData.command === "go-back") {
						navigate(-1);
						context.setAdding(false);
					}
					if (commandData.command === "change_Page") {
						context.setAdding(false);
						context.setPage("/" + commandData.link);

						if (commandData.type === "type-doctor-page" && commandData.link) {
							navigate(commandData.link);
						} else if (commandData.type !== "page") {
							const getDoctor = async () => {
								const response = await axios(
									`${context.url}/user/${commandData.link}
									`
								);
								context.setDoctor(commandData.link.split("/")[1]);
								context.setDoctorInfo(response.data.doctor);
								context.setPage(window.location.pathname);
								navigate(`/${commandData.link}`);
							};
							getDoctor();
						} else {
							navigate(`/${commandData.link}`);
						}
					}
					if (commandData.command === "show-all-doctors") {
						context.setAdding(false);

						if (!commandData.filter) {
							context.setSearchType("");
							context.setSearchValue("");
						} else {
							context.setSearchType(commandData.filter[0]);
							context.setSearchValue(commandData.filter[1]);
						}
						if (commandData.sort) {
							context.setSort(commandData.sort);
						}
						navigate("/doctors");
					}
					if (commandData.command === "show-family-doctor") {
					}
					if (commandData.command === "open-appointment-form") {
						context.setAdding(true);
					}
					if (commandData.command === "create-appointment") {
						navigate(`/${commandData.link}`);
						context.setAdding(true);
					}
					if (commandData.command === "nextMonth") {
						context.setCurrMonth(
							moment(context.currMonth)
								.startOf("month")
								.add(1, "months")
						);
						document
							.getElementsByClassName(
								"react-calendar__navigation__next-button"
							)[0]
							.click();
					}
					if (commandData.command === "backMonth") {
						context.setCurrMonth(
							moment(context.currMonth)
								.startOf("month")
								.subtract(1, "months")
						);
						document
							.getElementsByClassName(
								"react-calendar__navigation__prev-button"
							)[0]
							.click();
					}
					if (commandData.command === "nextYear") {
						context.setCurrYear(
							moment(context.currYear)
								.startOf("year")
								.add(1, "years")
						);
						document
							.getElementsByClassName(
								"react-calendar__navigation__next2-button"
							)[0]
							.click();
					}
					if (commandData.command === "backYear") {
						context.setCurrYear(
							moment(context.currYear)
								.startOf("year")
								.subtract(1, "years")
						);
						document
							.getElementsByClassName(
								"react-calendar__navigation__prev2-button"
							)[0]
							.click();
					}
					if (commandData.command === "date") {
						context.setDateState(new Date(commandData.date));
					}
					if (commandData.command === "title") {
						context.setTitle(commandData.title);
					}
					if (commandData.command === "description") {
						setDescription(commandData.description);
					}
					if (commandData.command === "time") {
						getTimeSlot(commandData.time, commandData.side);
					}
					if (commandData.command === "save") {
						document
							.getElementsByClassName("calendar-container-save-btn")[0]
							.click();

						setTimeout(() => {
							playResponse(
								`your appointment with doctor ${
									document.getElementsByClassName("date-for-appointment")[0].id
								} for ${
									document.getElementsByClassName("date-for-appointment")[0]
										.textContent
								} has been confirmed`
							);
						}, 500);
					}
				},
			});
			if (browserName !== "Safari") {
				window.alanBtnInstance.activate();
			}
		}
		if (context.doctors.length > 0) {
			window.alanBtnInstance.setVisualState({
				title: context.title,
				currPage: window.location.pathname.split("http://localhost:8080/")[0],
				doctorsData: context.doctors,
				currPatient: context.patient,
				currDoctor: context.doctor,
				isFormOpen: context.adding,
			});
		}
		const sendFamilyDoctorRqst = async (p, d) => {
			const res = await context.familyDrRequest(p, d);
			context.setFamilyDoctor(res.data.familyDoctor._id);
		};
		const sendRemoveFamilyDoctorRqst = async (p, d) => {
			await context.retreatFamilyRequest(p, d);
			context.setFamilyDoctor("");
		};
		const getTimeSlot = (pickedTime, side) => {
			const date = moment(context.dateState).format("YYYY-MM-DD");
			let time = "";
			const arr = pickedTime.split(" ")[0].split(":");
			const sign = pickedTime.split(" ")[1] ? pickedTime.split(" ")[1] : "";
			for (let i = 0; i < 3; i++) {
				if (i === 0 && sign === "p.m.") {
					const curr = parseInt(arr[0]) + 12;
					time = curr.toString();
				} else if (i === 0 && sign === "") {
					time = arr[0];
				}
				if (i === 0 && sign === "a.m.") {
					time =
						time +
						(arr[0].length === 1
							? "0" + arr[0]
							: arr[0] === "12"
							? "00"
							: arr[0]);
				}
				if (i > 0) {
					time = time + ":" + (arr[i] === "" || !arr[i] ? "00" : arr[i]);
				}
			}
			time = date + "T" + time;
			if (
				window.slotsMap[moment(new Date(time)).format("LT")] &&
				window.slotsMap[moment(new Date(time)).format("LT")][1]
			) {
				context.setLeftCurrTime(
					window.slotsMap[moment(new Date(time)).format("LT")][0]
				);

				playResponse(
					`holding the ${moment(new Date(time)).format(
						"LT"
					)} slot for you, do you want to fill the title?`
				);
			} else {
				const nextAvailableSlot = getNextAvailable(time);
				context.setLeftCurrTime(window.slotsMap[nextAvailableSlot][0]);
				playResponse(
					`sorry this time slot is either not available or has already booked. How about ${nextAvailableSlot}`
				);
			}
		};
	}, [
		context.adding,
		context.doctor,
		context.patient,
		context.doctors,
		context.leftRange,
		context.calendarRef,
		context.description,
		context.avalaibleSlots,
	]);
	useEffect(() => {
		if (Object.keys(context.specialities).length > 0) {
			window.alanBtnInstance.setVisualState({
				title: context.title,
				currPage: window.location.pathname.split("http://localhost:8080/")[0],
				doctorsData: context.doctors,
				doctorTypes: context.specialities,
				currDoctor: context.doctor,
				currPatient: context.patient,
				isFormOpen: context.adding,
			});
		}
	}, [context.specialities]);
	useEffect(() => {
		window.alanBtnInstance.setVisualState({
			title: context.title,
			currPage: window.location.pathname.split("http://localhost:8080/")[0],
			doctorsData: context.doctors,
			doctorTypes: context.specialities,
			currDoctor: context.doctor,
			currPatient: context.patient,
			isFormOpen: context.adding,
		});
	}, [context.doctor, context.familyDoctor]);
	useEffect(() => {
		window.alanBtnInstance.setVisualState({
			title: context.title,
			currPage: window.location.pathname.split("http://localhost:8080/")[0],
			doctorsData: context.doctors,
			doctorTypes: context.specialities,
			currDoctor: context.doctor,
			currPatient: context.patient,
			isFormOpen: context.adding,
		});
	}, [context.adding]);
	const getNextAvailable = (time) => {
		let start = moment(new Date(time)).add(45, "minutes");
		while (
			window.slotsMap[moment(new Date(start)).format("LT")] &&
			!window.slotsMap[moment(new Date(start)).format("LT")]
		) {
			start = moment(new Date(start)).add(45, "minutes");
		}
		return !(
			window.slotsMap[moment(new Date(start)).format("LT")] &&
			window.slotsMap[moment(new Date(start)).format("LT")]
		)
			? null
			: moment(new Date(start)).format("LT");
	};
	const stop = () => {
		if (browserName !== "Safari") {
			window.alanBtnInstance.deactivate();
		}
	};
	const playResponse = (response) => {
		window.alanBtnInstance.playText(response);
	};
	const setDoctorsState = () => {
		if (!window.welcomeMsg) {
			window.alanBtnInstance.playText(
				`hi ${window.patient.name}, Welcome to Alan Appointment. I can help you to submit an appointment or find and specific doctor!`
			);
			window.welcomeMsg = true;
		}
		window.alanBtnInstance.setVisualState({
			title: window.title,
			currPage: window.location.pathname.split("http://localhost:8080/")[0],
			doctorsData: window.doctors,
			currDoctor: window.doctor,
			isFormOpen: window.isFormOpen,
			currPatient: window.patient,
			doctorTypes: window.doctorTypes,
		});
	};
	const setDescription = (description) => {
		context.setDescription(description);
	};
	return (
		<div className="alan-btn-Container">
			<div ref={roolElRef}></div>
		</div>
	);
}

export default AlanContainer;
