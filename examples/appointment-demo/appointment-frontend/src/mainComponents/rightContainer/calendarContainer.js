import React, { useEffect, useRef, useContext } from "react";
import { AppointmentContext } from "../../provider/provider";

import Calendar from "react-calendar";
import ReactDOM from "react-dom";
import moment from "moment";

import EventForm from "./calendarContainer/eventForm";

function CalendarContainer() {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.CalendarContainer page");
	}
	const start = useRef();
	useEffect(() => {
		context.setCalendarRef(start);
		let eventArray = [];
		let calendarMap = {};
		const nodeArray =
			start.current &&
			ReactDOM.findDOMNode(start.current).querySelectorAll("[aria-label]");
		for (let i in nodeArray) {
			if (
				nodeArray[i] instanceof HTMLElement &&
				moment(nodeArray[i].getAttribute("aria-label")).isSame(
					context.currMonth,
					"month"
				)
			) {
				calendarMap[nodeArray[i].getAttribute("aria-label")] =
					nodeArray[i].parentNode;
			}
			context.setCalendarMap(calendarMap);
			if (
				nodeArray[i] instanceof HTMLElement &&
				context.appointmentsMap[nodeArray[i].getAttribute("aria-label")]
			) {
				nodeArray[i].classList.add(
					"react-calendar__month-view__days__day_with_event"
				);
			} else if (
				nodeArray[i] instanceof HTMLElement &&
				!context.appointmentsMap[nodeArray[i].getAttribute("aria-label")]
			) {
				nodeArray[i].classList.remove(
					"react-calendar__month-view__days__day_with_event"
				);
			}
			eventArray.push(nodeArray[i]);
		}
	}, [
		context.appointmentsMap,
		context.dateState,
		context.currMonth,
		context.currYear,
	]);

	const getClickes = (e) => {
		if (
			e.target.classList.contains("react-calendar__navigation__next-button")
		) {
			context.setCurrMonth(
				moment(context.currMonth)
					.startOf("month")
					.add(1, "months")
			);
		} else if (
			e.target.classList.contains("react-calendar__navigation__prev-button")
		) {
			context.setCurrMonth(
				moment(context.currMonth)
					.startOf("month")
					.subtract(1, "months")
			);
		} else if (
			e.target.classList.contains("react-calendar__navigation__prev2-button")
		) {
			context.setCurrYear(
				moment(context.currYear)
					.startOf("year")
					.subtract(1, "years")
			);
		} else if (
			e.target.classList.contains("react-calendar__navigation__next2-button")
		) {
			context.setCurrYear(
				moment(context.currYear)
					.startOf("year")
					.add(1, "years")
			);
		}
	};
	return (
		<div className="calendar-container" ref={start} onClick={getClickes}>
			<Calendar value={context.dateState} onChange={context.pickDay} />
			<EventForm
				adding={context.adding}
				date={context.dateState}
				setAdding={context.setAdding}
				pickedDoctor={context.doctor}
				addEvent={context.addEvent}
			/>
		</div>
	);
}

export default CalendarContainer;
