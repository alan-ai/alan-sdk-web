import React, { useContext, useState } from "react";
import { AppointmentContext } from "../provider/provider";
import { Routes, Route } from "react-router-dom";

import moment from "moment";

import AlanContainer from "../mainComponents/alanContainer";
import LeftContainer from "../mainComponents/leftContainer";
import MiddleContainer from "../mainComponents/middleContainer";
import RightContainer from "../mainComponents/rightContainer";

function AllLinks() {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist. AlanContainer");
	}

	const [currUser] = useState({});
	const [isAuth] = useState(true);

	return (
		<>
			{isAuth ? (
				<div className="main-container">
					<AlanContainer />
					<LeftContainer />
					<Routes>
						<Route exact path="/" element={<MiddleContainer page="home" />} />
						<Route
							exact
							path="/profile"
							element={
								<MiddleContainer
									page="profile"
									// patient={currUser.patient}
								/>
							}
						/>
						<Route
							exact
							path="/doctors"
							element={<MiddleContainer page="doctors" />}
						/>
						<Route
							exact
							path="/doctors/:doctor"
							element={<MiddleContainer page="doctor" />}
						/>
						<Route
							exact
							path="/calendar"
							element={<MiddleContainer page="form" />}
						/>
						<Route
							exact
							path="/creat-doctor"
							element={<MiddleContainer page="form" />}
						/>
						{context.appointments.map((app, index) => {
							return (
								<Route
									key={index}
									exact
									path={`/appointments/${context.patient._id}_${
										moment.utc(moment(app.start))._i
									}`}
									element={<MiddleContainer page="appointment" app={app} />}
								/>
							);
						})}
					</Routes>
					<RightContainer
						currUserAppointments={
							currUser.patient ? currUser.patient.appointments : []
						}
					/>
				</div>
			) : (
				<div className="google-login-btn-container"> </div>
			)}
		</>
	);
}

export default AllLinks;
