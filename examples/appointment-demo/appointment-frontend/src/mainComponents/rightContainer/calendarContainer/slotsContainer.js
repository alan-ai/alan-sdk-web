import React, { useContext, useEffect, useRef } from "react";
import { AppointmentContext } from "../../../provider/provider";

import Button from "@mui/material/Button";

function SlotsContainer() {
	const currSlot = useRef();
	const context = useContext(AppointmentContext);
	if (!context) {
		throw Error("Context dose not exist.FormDoctorCard page");
	}
	useEffect(() => {
		if (currSlot.current)
			currSlot.current.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
	});

	return (
		<div className="doctor-time-slots-scroll">
			{context.allSlots.map((slot, index) => (
				<Button
					key={index}
					style={{
						background: "#387CEA",
						color: index === context.leftCurrTime ? "#3ff773" : "white",
						opacity:
							context.slotsMap[slot.format("LT")] &&
							context.slotsMap[slot.format("LT")][1]
								? "1"
								: ".4",
						border:
							index === context.leftCurrTime
								? "#3ff773 1px solid"
								: "white 1px solid",

						boxShadow:
							context.slotsMap[slot.format("LT")] &&
							context.slotsMap[slot.format("LT")][1]
								? "rgba(0, 0, 0, 0.03) 0px 3px 6px, rgba(0, 0, 0, 0.04) 0px 3px 6px"
								: "none",
						pointerEvents:
							context.slotsMap[slot.format("LT")] &&
							!context.slotsMap[slot.format("LT")][1]
								? "none"
								: "auto",
						width: "110px",
						minWidth: "110px",
						height: "40px",
						minHeight: "40px",
					}}
					variant="outlined"
					ref={index === context.leftCurrTime ? currSlot : null}
					onClick={(e) => context.setLeftCurrTime(index)}
				>
					{slot.format("LT")}
				</Button>
			))}
		</div>
	);
}

export default SlotsContainer;
