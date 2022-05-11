import React, { useContext } from "react";

import { AppointmentContext } from "../../../provider/provider";

function FormDoctorCard({ doctor }) {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.FormDoctorCard page");
	}
	return (
		<div className="form-doctor-card-Warapper">
			<div
				className="form-doctor-card-Warapper-img"
				style={{
					backgroundImage: `url("${doctor ? doctor.image : ""}")`,
				}}
			/>
			<div className="form-doctor-card-Warapper-desc">
				{doctor &&
					["name", "type", "speciality", "address", "city"].map(
						(title, index) => (
							<div className="profile-card-info-sec" key={index}>
								{title === "name" ? "Fullname" : title + ":"}
								<span>
									{title === "name"
										? doctor.name + " " + doctor.lastName
										: doctor[title]}
								</span>
							</div>
						)
					)}
			</div>
		</div>
	);
}

export default FormDoctorCard;
