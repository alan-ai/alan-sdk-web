import React from "react";

import moment from "moment";

import { Link } from "react-router-dom";

function AppointmentContainer({
	currAppointments,
	openAddEvent,
	doctor,
	patient,
}) {
	return (
		<div className="appointment-container">
			<div className="appointment-container-scroller-wrapper">
				<div className="appointment-container-scroller">
					{currAppointments &&
						[...currAppointments].map((app, i) => (
							<Link
								// <Link
								style={{ textDecoration: "none" }}
								to={`/appointments/${patient._id}_${
									moment.utc(moment(app.start))._i
								}`}
								className="appointment-container-scroller-date"
								key={i}
							>
								<div className="appointment-container-scroller-date-left">
									{moment(new Date(app.start)).format("MMM")}
									<span>{moment(new Date(app.start)).format("DD")}</span>
								</div>
								<div className="appointment-container-scroller-date-right">
									{moment(new Date(app.start)).format("LT")} -
									{moment(new Date(app.start))
										.add(45, "minutes")
										.format("LT")}
									<span></span>
								</div>
							</Link>
						))}
				</div>
			</div>
			{doctor !== "" && (
				<div className="appointment-container-add-date">
					<div
						className="appointment-container-add-date-sign"
						onClick={openAddEvent}
					>
						+
					</div>
				</div>
			)}
		</div>
	);
}

export default AppointmentContainer;
