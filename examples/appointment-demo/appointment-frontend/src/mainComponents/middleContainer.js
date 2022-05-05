import React from "react";

import Doctors from "./middleContainer/doctors";
import Doctor from "./middleContainer/doctor";
import Profile from "./middleContainer/profile";
import Home from "./middleContainer/home";
import Appointment from "./middleContainer/appointment";
import CreatDoctor from "./middleContainer/creatUserForms/creatDoctor";

function MiddleContainer({ page, patient, app }) {
	const pageMap = {
		doctors: <Doctors />,
		doctor: <Doctor />,
		profile: <Profile patient={patient} />,
		home: <Home />,
		appointment: <Appointment app={app} />,
		form: <CreatDoctor />,
	};

	return <div className="middle-container">{pageMap[page]}</div>;
}

export default MiddleContainer;
