import React, { useContext } from "react";
import { AppointmentContext } from "../../provider/provider";

import Search from "../../icons/search";
import Close from "../../icons/close";

import { Link } from "react-router-dom";

function Doctors() {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.Doctors page");
	}

	const getDoctor = (e) => {
		context.setPage(`${context.url}/doctor/${e.target.id}`);
	};
	const openSearch = (e) => {
		context.setSearchIsOpen((prev) => !prev);
	};
	const changeQuery = (e) => {};
	return (
		<div className="middle-doctors-container">
			<div
				className="middle-doctors-container-search"
				style={{
					maxWidth: !context.searchIsOpen ? "50px" : "600px",
					minWidth: !context.searchIsOpen ? "50px" : "600px",
				}}
			>
				<input placeholder="search..." value={context.searchValue} />
				<div className="middle-doctors-container-search-btns">
					<div>
						<Search
							doSearch={changeQuery}
							openSearch={openSearch}
							searchIsOpen={context.searchIsOpen}
						/>
					</div>
					<div
						style={{
							display: context.searchIsOpen ? "flex" : "none",
						}}
					>
						<Close openSearch={openSearch} />
					</div>
				</div>
			</div>
			<div className="middle-doctors-container-doctors">
				{Array.isArray(context.doctors) &&
					context.doctors.map((d, index) => (
						<Link
							to={`/doctors/${d._id}`}
							className="doctor-card"
							key={index}
							id={d._id}
							onClick={getDoctor}
						>
							<img
								id={d._id + "+"}
								src={d.image}
								alt="doctor"
								crossOrigin="anonymous"
							/>
							<div className="doctor-card-wrapper" id={d._id + "++"}>
								<div className="doctor-card-name" id={d._id + "+++"}>
									Dr. {d.name + " " + d.lastName}
								</div>
								<span
									className={`doctor-card-${
										d.type === "Internal Medicine" ? "family" : "specialist"
									}`}
									id={d._id + "++++"}
								>
									{d.type === "specialist" ? d.speciality : d.type}
								</span>
							</div>
						</Link>
					))}
			</div>
			<div className="middle-doctors-container-speciality">
				{Object.keys(context.specialities).map((skill, i) => {
					return (
						<div
							key={i}
							className="middle-doctors-container-speciality-cube"
							id={
								context.searchValue === skill
									? "middle-doctors-container-speciality-cube-actived"
									: ""
							}
						>
							{skill}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default Doctors;
