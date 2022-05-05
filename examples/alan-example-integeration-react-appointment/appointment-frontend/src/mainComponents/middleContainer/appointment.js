import React from "react";

import AddTaskIcon from "@mui/icons-material/AddTask";

import moment from "moment";

function Appointment({ app }) {
	return (
		<div className="appointment-card">
			<div className="appointment-card-sign">
				<AddTaskIcon
					style={{ width: "10vh", height: "10vh", color: "#3ff773" }}
				/>
			</div>
			<div className="appointment-card-title">
				Your Appointment has been confirmed!
			</div>
			<div className="appointment-card-info">
				<div class="date-for-appointment" id={`${app.doctorLastName}`}>
					<span>Date:</span>
					{` ${moment(app.start).format("LLLL")}`}
				</div>
				<div>
					<span>With:</span>
					{`Dr. ${app.doctorName + " " + app.doctorLastName} `}
				</div>
			</div>
		</div>
	);
}

export default Appointment;
