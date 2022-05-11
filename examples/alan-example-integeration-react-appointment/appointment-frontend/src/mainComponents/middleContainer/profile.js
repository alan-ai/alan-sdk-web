import React, { useContext } from "react";
import { AppointmentContext } from "../../provider/provider";

import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

import { Link } from "react-router-dom";

import Heart from "../../icons/heart";
import Blood from "../../icons/blood";
import Temprature from "../../icons/temprature";

function Profile() {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.Profile page");
	}
	const getDoctor = (e) => {
		context.setPage(`${context.url}/doctor/${e.target.id}`);
	};
	return (
		<div className="profile-card">
			<div className="profile-card-img-wrapper">
				<div
					className="profile-card-img"
					style={{
						backgroundImage: `url("${
							context.patient ? context.patient.image : ""
						}")`,
					}}
				></div>{" "}
				<div className="profile-card-img-txt">
					{" "}
					{context.patient
						? context.patient.name + " " + context.patient.lastName
						: ""}{" "}
				</div>{" "}
			</div>{" "}
			<div className="profile-card-info-wrapper">
				<div className="profile-card-info-title"> Information: </div>{" "}
				{context.patient &&
					["Gender", "BloodType", "Height", "Weight"].map((info, index) => (
						<div className="profile-card-info-sec" key={index}>
							{" "}
							{info === "BloodType" ? "Blood Type:" : info + ":"}
							<span> {context.patient[info]} </span>{" "}
						</div>
					))}{" "}
				<div
					className="profile-card-info-sec"
					style={{
						opacity: context.patient["familyDoctor"] ? 1 : 0.3,
					}}
				>
					<div
						id="profile-card-info-sec-family-doctor"
						style={{ opacity: context.isArrowVisible ? "1" : "0" }}
					>
						<ArrowForwardIosIcon style={{ color: "#3ff773" }} />
					</div>
					Family Doctor:
					<span
						style={{
							fontSize: context.patient["familyDoctor"] ? "1rem" : ".7rem",
						}}
					>
						{" "}
						{context.patient["familyDoctor"] ? (
							<Link
								to={`/doctors/${context.patient["familyDoctor"]._id}`}
								style={{ textDecoration: "none", color: "#3ff773" }}
								onClick={getDoctor}
							>{`${context.patient["familyDoctor"].name} ${context.patient["familyDoctor"].lastName}`}</Link>
						) : (
							"No family doctor has been asigned yet."
						)}
					</span>{" "}
				</div>
			</div>{" "}
			<div className="profile-card-options-wrapper">
				{" "}
				{[<Heart />, <Blood />, <Temprature />].map((icon, index) => (
					<div key={index} className="profile-card-options-card">
						{" "}
						{icon}{" "}
					</div>
				))}{" "}
			</div>{" "}
		</div>
	);
}

export default Profile;
