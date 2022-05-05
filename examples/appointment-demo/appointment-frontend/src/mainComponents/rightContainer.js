import React, { useContext } from "react";
import { AppointmentContext } from "../provider/provider";

import AppointmentContainer from "./rightContainer/appointmentContainer";
import CalendarContainer from "./rightContainer/calendarContainer";

function RightContainer() {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.RightContainer page");
	}
	return (
		<div className="right-container">
			<CalendarContainer />
			<AppointmentContainer
				patient={context.patient}
				doctor={context.doctor}
				openAddEvent={context.openAddEvent}
				currAppointments={context.appointments}
			/>
		</div>
	);
}

export default RightContainer;
