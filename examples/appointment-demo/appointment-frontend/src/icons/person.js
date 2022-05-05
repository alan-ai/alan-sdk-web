import React from "react";

function Person({ hoveredBtn }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			xmlnsXlink="http://www.w3.org/1999/xlink"
			version="1.1"
			viewBox="0 0 256 256"
			xmlSpace="preserve"
		>
			<desc>Created with Fabric.js 1.7.22</desc>
			<defs></defs>
			<g transform="translate(128 128) scale(0.72 0.72)">
				<g
					style={{
						stroke: "none",
						strokeWidth: "0",
						strokeDasharray: "none",
						strokeLinejoin: "miter",
						strokeLinecap: "butt",
						strokeMiterlimit: "10",
						fill: "none",
						fillRule: "nonzero",
						opacity: "1",
					}}
					transform="translate(-175.05 -175.05000000000004) scale(3.89 3.89)"
				>
					<path
						className="btn"
						d="M 45 40.375 L 45 40.375 c -9.415 0 -17.118 -7.703 -17.118 -17.118 v -6.139 C 27.882 7.703 35.585 0 45 0 h 0 c 9.415 0 17.118 7.703 17.118 17.118 v 6.139 C 62.118 32.672 54.415 40.375 45 40.375 z"
						style={{
							stroke: "none",
							strokeWidth: "1",
							strokeDasharray: "none",
							strokeLinejoin: "miter",
							strokeLinecap: "butt",
							strokeMiterlimit: "10",
							fill: hoveredBtn === "person" ? "#3776EB" : "#717171",
							fillRule: "nonzero",
							opacity: "1",
						}}
						transform=" matrix(1 0 0 1 0 0) "
						strokeLinecap="round"
					/>
					<path
						className="btn"
						d="M 54.639 42.727 C 51.743 44.226 48.47 45.09 45 45.09 s -6.743 -0.863 -9.639 -2.363 c -12.942 1.931 -22.952 13.162 -22.952 26.619 v 17.707 c 0 1.621 1.326 2.946 2.946 2.946 h 59.29 c 1.621 0 2.946 -1.326 2.946 -2.946 V 69.347 C 77.591 55.889 67.581 44.659 54.639 42.727 z"
						style={{
							stroke: "none",
							strokeWidth: "1",
							strokeDasharray: "none",
							strokeLinejoin: "miter",
							strokeLinecap: "butt",
							strokeMiterlimit: "10",
							fill: hoveredBtn === "person" ? "#3776EB" : "#717171",
							fillRule: "nonzero",
							opacity: "1",
						}}
						transform=" matrix(1 0 0 1 0 0) "
						strokeLinecap="round"
					/>
				</g>
			</g>
		</svg>
	);
}

export default Person;
