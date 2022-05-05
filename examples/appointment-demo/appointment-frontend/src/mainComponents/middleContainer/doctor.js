import React, { useEffect, useContext } from "react";
import { AppointmentContext } from "../../provider/provider";

import Button from "@mui/material/Button";

function Doctor() {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist. Doctor page");
	}
	useEffect(() => {}, [context.familyDoctor]);

	const sendFamilyDoctorRqst = async () => {
		const res = await context.familyDrRequest(
			context.patient._id,
			context.doctorInfo._id
		);
		context.setFamilyDoctor(res.data.familyDoctor._id);
	};
	const retreatFamilyDoctorRqst = async () => {
		await context.retreatFamilyRequest(
			context.patient._id,
			context.doctorInfo._id
		);
		context.setFamilyDoctor("");
	};

	return (
		<div className="profile-card">
			<div className="doctor-profile-card-img-wrapper">
				<div className="doctor-profile-card-img">
					<img
						src={context.doctorInfo ? context.doctorInfo.image : ""}
						alt="doctor"
						crossOrigin="anonymous"
					/>
				</div>
				<div className="profile-card-img-txt">
					{context.doctorInfo
						? "DR." +
						  context.doctorInfo.name +
						  " " +
						  context.doctorInfo.lastName
						: ""}
				</div>
			</div>
			<div className="doctor-profile-card-info-wrapper">
				<div className="profile-card-info-title"> Information: </div>
				{context.doctorInfo &&
					["type", "speciality", "address", "city"].map((info, index) => (
						<div className="profile-card-info-sec" key={index}>
							{info + ":"} <span> {context.doctorInfo[info]} </span>
						</div>
					))}
				{context.familyDoctor === "" &&
				context.doctorInfo.type === "Internal Medicine" &&
				context.familyDoctor !== context.doctorInfo._id ? (
					<Button
						id={``}
						style={{
							position: "absolute",
							bottom: "15px",
							right: "15px",
							width: "30%",
							height: "4vh",
							border: "#7DF482 solid 1px",
							fontSize: ".6rem",
							color: "#7DF482",
						}}
						variant="outlined"
						onClick={sendFamilyDoctorRqst}
					>
						Family Doctor Request
					</Button>
				) : context.familyDoctor === context.doctorInfo._id ||
				  (context.patient.familyDoctor &&
						context.patient.familyDoctor._id === context.doctorInfo._id) ? (
					<Button
						style={{
							background: "#7DF482",
							position: "absolute",
							bottom: "15px",
							right: "15px",
							width: "30%",
							height: "4vh",
							fontSize: ".6rem",
							boxShadow: "none",
						}}
						variant="contained"
						onClick={retreatFamilyDoctorRqst}
					>
						Retreat Family request
					</Button>
				) : (
					<></>
				)}
			</div>
		</div>
	);
}

export default Doctor;
