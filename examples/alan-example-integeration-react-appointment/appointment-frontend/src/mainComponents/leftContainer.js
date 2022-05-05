import React, { useState, useEffect, useContext } from "react";
import { AppointmentContext } from "../provider/provider";

import Calendar from "../icons/calendar";
import Logo from "../icons/logo";
import Logout from "../icons/logout";
import Person from "../icons/person";
import Team from "../icons/team";

import { Link } from "react-router-dom";

function NavBar() {
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.Navbar");
	}
	useEffect(() => {
		setactiveBtn(window.location.pathname);
	}, [window.location.pathname]);
	const [hoveredBtn, setHoveredBtn] = useState("");
	const [activeBtn, setactiveBtn] = useState("");
	const hover = (e) => {
		if (e.target.className === "nav-btn") setHoveredBtn(e.target.id);
		if (e.target.className === "logout-container") setHoveredBtn("out");
	};
	const unhover = (e) => {
		setHoveredBtn("");
	};
	const click = (e) => {
		context.setPage(window.location.pathname);
		context.setAdding(false);
		setactiveBtn(window.location.pathname);
	};
	return (
		<div
			className="left-container"
			onMouseOver={hover}
			onMouseLeave={unhover}
			onClick={click}
		>
			<div className="logo-container">
				<Link to="/">
					<Logo />
				</Link>
			</div>
			<div className="nav-container">
				<div
					className={`${activeBtn === "/profile" ? " active-nav-btn" : ""}`}
					id="person"
				>
					<Link to="/profile" className="nav-btn">
						<Person hoveredBtn={hoveredBtn} />
					</Link>
				</div>
				<div
					className={`${activeBtn === "/doctors" ? "active-nav-btn" : ""}`}
					id="team"
				>
					<Link to="/doctors" className="nav-btn">
						<Team hoveredBtn={hoveredBtn} />
					</Link>
				</div>
				<div
					className={`${activeBtn === "/calendar" ? "active-nav-btn" : ""}`}
					id="calendar"
				>
					<Link to="/creat-doctor" className="nav-btn">
						<Calendar hoveredBtn={hoveredBtn} />
					</Link>
				</div>
			</div>
			<div className="logout-container">
				<Logout hoveredBtn={hoveredBtn} />
			</div>
			<div> </div>
		</div>
	);
}

export default NavBar;
