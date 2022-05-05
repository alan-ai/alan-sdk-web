import React from "react";

function Close({ openSearch }) {
	return (
		<svg
			className="close"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			onClick={openSearch}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="3"
				stroke="#387CEA"
				d="M12 12 7 7m5 5 5 5m-5-5 5-5m-5 5-5 5"
			/>
		</svg>
	);
}

export default Close;
