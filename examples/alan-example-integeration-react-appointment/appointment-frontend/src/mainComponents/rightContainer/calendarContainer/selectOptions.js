import React, { useEffect, useRef } from "react";

function SelectOptions({
	side,
	slots,
	leftCurrTime,
	rightCurrTime,
	currLot,
	isToday,
	isActive,
	setLeftCurrTime,
	unavailableSlots,
	setRightCurrTime,
}) {
	const currSlot = useRef();

	useEffect(() => {
		if (currSlot.current)
			currSlot.current.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
	});
	return (
		<div
			className={`select-option-contrainer-${side}`}
			style={{
				display: isActive !== -1 ? "flex" : "none",
			}}
		>
			{slots.map((slot, i) => {
				const notAvailable =
					(isToday && i < leftCurrTime) || unavailableSlots[slot.format("lll")];
				return !notAvailable ? (
					<div
						key={i}
						ref={i === currLot ? currSlot : null}
						style={{
							color: i === currLot ? "#3891ea" : "#616479f6",
							fontWeight: i === currLot ? "500" : "300",
							pointerEvents: isToday && i < leftCurrTime ? "none" : "all",
						}}
						onClick={(e) => {
							if (side === "left") {
								setLeftCurrTime(i);
								rightCurrTime <= i && setRightCurrTime(i + 1);
							} else {
								setRightCurrTime(i);
								leftCurrTime >= i && setLeftCurrTime(i - 1);
							}
						}}
					>
						{slot.format("LT")}
					</div>
				) : null;
			})}
		</div>
	);
}

export default SelectOptions;
