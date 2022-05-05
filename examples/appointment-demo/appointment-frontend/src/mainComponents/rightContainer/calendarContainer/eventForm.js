import React, { useContext, useEffect } from "react";
import { AppointmentContext } from "../../../provider/provider";
import moment from "moment";
import axios from "axios";

import FormDoctorCard from "./formDoctorCard";

import SlotsContainer from "./slotsContainer";

function EventForm({ date, addEvent }) {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.FormDoctorCard page");
	}

	useEffect(() => {
		const getDoctor = async () => {
			let response = {};
			if (context.doctor && context.doctor !== "") {
				response = await axios(`${context.url}/user/doctors/${context.doctor}`);
				context.setDoctor(response.data.doctor._id);
				getAppointments(response.data.doctor.appointments);
			}
		};
		context.doctor !== "" && context.doctor && getDoctor();
	}, [context.doctor, context.adding]);

	useEffect(() => {
		const getDoctor = async () => {
			let response = {};
			let currunAvailable = {};
			if (context.doctor !== "") {
				response = await axios(`${context.url}/user/doctors/${context.doctor}`);
				currunAvailable = getAppointments(response.data.doctor.appointments);
			}
			let count = 0;
			let start = moment(new Date(date))
				.startOf("day")
				.add(6, "hours");
			let startSlot = -1;
			let leftArr = [];
			let rightArr = [];
			let arr = [];
			let arrMap = {};
			let map = {};
			let i = 0;
			let availableCount = 0;

			while (moment(new Date(start)) < moment(new Date(date)).endOf("day")) {
				if (
					moment(new Date(start)).isAfter(
						moment(new Date(date))
							.startOf("day")
							.add(6, "hours")
					) &&
					start._i >= new Date(date)
				) {
					arr.push(moment(start));
					const pastTime =
						moment(new Date()).isSame(date, "d") &&
						moment(new Date(start)) < moment(new Date());
					if (currunAvailable[start.format("lll")] || pastTime) {
						map[moment(start).format("LT")] = i;
						arrMap[moment(start).format("LT")] = [i, false];
					} else {
						startSlot = startSlot < 0 ? i : startSlot;
						arrMap[moment(start).format("LT")] = [i, true];
						availableCount++;
					}

					i++;
					leftArr.push(moment(start));
					rightArr.push(moment(start));
				}
				start = start.add(45, "minutes");
				count++;
			}
			context.setLeftCurrTime(startSlot);
			context.setAvailableCount(availableCount);
			context.setAvalaibleSlots(map);
			context.setSlotsMap(arrMap);
			context.setAllSlots(arr);
			context.setLeftRenge(leftArr);
			context.setRightRenge(rightArr);
		};
		getDoctor();
		context.setRightCurrTime(1);
	}, [date, context.doctor]);
	const getAppointments = (appointments) => {
		let appointmenMap = {};
		for (let index in appointments) {
			let start = moment(appointments[index].start);
			// let end = moment(appointments[index].end);
			appointmenMap[start.format("lll")] = true;
		}
		for (let index in context.patient.appointments) {
			let start = moment(context.patient.appointments[index].start);
			appointmenMap[start] = true;
		}
		context.setUnavailableSlots(appointmenMap);
		return appointmenMap;
	};

	const timePicker = (e) => {
		if (e.target.className === "event-form-container-date-input") {
			e.target.id === "left" ? context.setIsActive(0) : context.setIsActive(1);
			e.target.id === "left"
				? context.setSide("left")
				: context.setSide("right");
		} else if (e.target.className === "event-form-container-header-btn") {
			context.setAdding(false);
		} else if (e.target.className === "calendar-container-save-btn") {
			let map = {};
			for (let i = context.leftCurrTime; i < context.rightCurrTime; i++) {
				map[context.leftRange[i]] = true;
			}
			addEvent(
				context.title,
				context.description,
				context.leftRange[context.leftCurrTime],
				context.rightRange[context.rightCurrTime]
			);
		} else {
			context.setIsActive(-1);
		}
	};
	const getTitle = (e) => {
		context.setTitle(e.target.value);
	};
	return (
		<div
			className="event-form-container"
			onClick={timePicker}
			style={{
				display: context.adding ? "flex" : "none",
			}}
		>
			<div className="event-form-container-header">
				<div className="event-form-container-header-btn"> x </div>
			</div>
			<div className="event-form-container-title">
				<input
					className="event-form-container-title-input"
					placeholder="Title..."
					onChange={getTitle}
					value={context.title}
				/>
			</div>
			<FormDoctorCard doctor={context.doctorInfo} />
			<div className="doctor-time-slots-wrapper">
				<div className="doctor-time-slots-date">
					{`${moment(date).format("dddd, MMMM DD")}`}
				</div>
				<div className="doctor-available-time-slots">
					<span>{`  ${context.availableCount} `}</span> {` available slots`}
				</div>
				<SlotsContainer />
			</div>
			<div className="calendar-container-save-btn">Submit Appointment </div>
		</div>
	);
}

export default EventForm;
