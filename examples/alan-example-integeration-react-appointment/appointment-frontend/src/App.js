import React from "react";
import { AppointmentContextComp } from "./provider/provider";

import AllLinks from "./allLinks/allLinks";

function App() {
	return (
		<AppointmentContextComp>
			<div className="app">
				<AllLinks />
			</div>
		</AppointmentContextComp>
	);
}

export default App;
