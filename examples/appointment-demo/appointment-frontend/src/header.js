import React, { useState } from "react";

import Search from "./icons/search";

function Header({ currUser }) {
	const [searchIsOpen, setSearchIsOpen] = useState(false);
	const openSearch = (e) => {
		setSearchIsOpen((prev) => !prev);
	};
	return (
		<div className="header-container">
			<div className="header-container-name"> </div>
			<div
				className="header-container-search"
				style={{
					maxWidth: !searchIsOpen ? "44px" : "230px",
					minWidth: !searchIsOpen ? "44px" : "230px",
					borderRadius: "25px",
				}}
			>
				<input placeholder="search..." />
				<Search openSearch={openSearch} />
			</div>
		</div>
	);
}

export default Header;
