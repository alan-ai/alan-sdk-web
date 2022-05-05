import React from "react";

import axios from "axios";

const url = "";

function CreatDoctor() {
	const handleSubmit = (event) => {
		event.preventDefault();
		const createProfile = async () => {
			const body = {
				name: "Kirsten",
				lastName: "Cain",
				email: "Kirsten@Cain.com",
				password: "Cain1111",
				type: "specialist",
				address: "6074 S Jordan Canal Rd",
				city: "Taylorsville",
				lat: 40.6407658,
				lng: -111.9439967,
				image:
					"https://www.pexels.com/photo/woman-in-blue-and-white-stethoscope-6749777/",
				speciality: "Cardiologists",
			};
			const response = await axios.post(`${url}/user/doctor/doctor`, body, {
				header: {
					"Content-Type": "application/json",
				},
			});
			console.log("response", response);
		};
		createProfile();
	};

	return (
		<form
			onSubmit={handleSubmit}
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{/* <input type="submit" /> */}
		</form>
	);
}

export default CreatDoctor;
