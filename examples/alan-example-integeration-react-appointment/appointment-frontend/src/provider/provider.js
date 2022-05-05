import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "axios";
import moment from "moment";

export const AppointmentContext = React.createContext();
export const AppointmentProvider = AppointmentContext.Provider;
export const AppointmentContextComp = ({ children }) => {
	const url = "";
	const navigate = useNavigate();

	const [adding, setAdding] = useState(false);
	const [welcomeMsg, setWelcomeMsg] = useState(false);
	const [calendarRef, setCalendarRef] = useState(null);
	const [searchIsOpen, setSearchIsOpen] = useState(false);
	const [isArrowVisible, setIsArrowVisible] = useState(false);
	const [isActive, setIsActive] = useState(-1);
	const [availableCount, setAvailableCount] = useState(0);
	const [leftCurrTime, setLeftCurrTime] = useState(0);
	const [rightCurrTime, setRightCurrTime] = useState(1);
	const [side, setSide] = useState("");
	const [title, setTitle] = useState("");
	const [page, setPage] = useState("home");
	const [doctor, setDoctor] = useState("");
	const [sort, setSort] = useState("");
	const [searchType, setSearchType] = useState("");
	const [searchValue, setSearchValue] = useState("");
	const [description, setDescription] = useState("");
	const [familyDoctor, setFamilyDoctor] = useState("");
	const [saveBtnStatus, setSaveBtnStatus] = useState("");
	const [dateState, setDateState] = useState(new Date());
	const [currMonth, setCurrMonth] = useState(new Date());
	const [currYear, setCurrYear] = useState(new Date());
	const [doctors, setDoctors] = useState([]);
	const [allSlots, setAllSlots] = useState([]);
	const [leftRange, setLeftRenge] = useState([]);
	const [rightRange, setRightRenge] = useState([]);
	const [appointments, setAppointments] = useState([]);
	const [patient, setPatient] = useState({});
	const [slotsMap, setSlotsMap] = useState({});
	const [doctorInfo, setDoctorInfo] = useState({});
	const [calendarMap, setCalendarMap] = useState({});
	const [specialities, setSpecialities] = useState({});
	const [avalaibleSlots, setAvalaibleSlots] = useState({});
	const [appointmentsMap, setAppointmentsMap] = useState({});
	const [unavailableSlots, setUnavailableSlots] = useState({});

	useEffect(() => {
		const getDoctors = async () => {
			const response = await axios(url + "/user/doctors");
			const curSpecialities = getAvailableSpecialities(response.data.doctors);
			const filteredDoctors =
				searchValue !== ""
					? response.data.doctors.filter((d) => d[searchType] === searchValue)
					: response.data.doctors;
			setDoctors(filteredDoctors);
			setSpecialities(curSpecialities.types);
		};
		getDoctors();
		const getUser = async () => {
			const response = await axios(url + "/user/patient");
			setPatient(response.data.patient);
			setFamilyDoctor(
				response.data.patient.familyDoctor
					? response.data.patient.familyDoctor._id
					: ""
			);
		};
		getUser();
		const getAppointments = async () => {
			let response = null;
			let appointmentSlots = {};
			if (
				window.location.href.split("doctors/")[1] &&
				window.location.href.split("doctors/")[1] !== ""
			) {
				response = await axios(
					`${url}/user/doctors/${window.location.href.split("doctors/")[1]}`
				);
				setDoctorInfo(response.data.doctor);
				setDoctor(window.location.href.split("doctors/")[1]);
			} else {
				setDoctor("");
				setDoctorInfo({});
				response = await axios(url + "/user/patient");
			}
			for (let index in response.data.appointments) {
				appointmentSlots[
					moment(response.data.appointments[index].start).format("MMMM D, YYYY")
				]
					? appointmentSlots[
							moment(response.data.appointments[index].start).format(
								"MMMM D, YYYY"
							)
					  ].push(response.data.appointments[index])
					: (appointmentSlots[
							moment(response.data.appointments[index].start).format(
								"MMMM D, YYYY"
							)
					  ] = [response.data.appointments[index]]);
			}
			setAppointmentsMap(appointmentSlots);
			setAppointments(response.data.appointments);
		};

		getAppointments();

		setPage(window.location.pathname);
	}, []);

	useEffect(() => {
		const getDoctors = async () => {
			const response = await axios(url + "/user/doctors");
			const curSpecialities = getAvailableSpecialities(response.data.doctors);
			const filteredDoctors =
				searchValue !== ""
					? response.data.doctors.filter((d) => d[searchType] === searchValue)
					: response.data.doctors;
			const sortedDoctors =
				sort !== ""
					? filteredDoctors.sort(
							(a, b) =>
								getDistanceLatLon(patient.lat, patient.lng, a.lat, a.lng) -
								getDistanceLatLon(patient.lat, patient.lng, b.lat, b.lng)
					  )
					: filteredDoctors;
			setDoctors(sortedDoctors);
			setSpecialities(curSpecialities.types);
		};
		getDoctors();
		const getUser = async () => {
			const response = await axios(url + "/user/patient");
			setPatient(response.data.patient);
			setFamilyDoctor(
				response.data.patient.familyDoctor
					? response.data.patient.familyDoctor._id
					: ""
			);
		};
		getUser();
		const getAppointments = async () => {
			let response = null;
			let appointmentSlots = {};

			if (
				window.location.href.split("doctors/")[1] &&
				window.location.href.split("doctors/")[1] !== ""
			) {
				response = await axios(
					`${url}/user/doctors/${window.location.href.split("doctors/")[1]}`
				);
				setDoctor(window.location.href.split("doctors/")[1]);
				setDoctorInfo(response.data.doctor);
			} else {
				setDoctor("");
				setDoctorInfo({});
				response = await axios(url + "/appointments/patient");
			}
			for (let index in response.data.appointments) {
				appointmentSlots[
					moment(response.data.appointments[index].start).format("MMMM D, YYYY")
				]
					? appointmentSlots[
							moment(response.data.appointments[index].start).format(
								"MMMM D, YYYY"
							)
					  ].push(response.data.appointments[index])
					: (appointmentSlots[
							moment(response.data.appointments[index].start).format(
								"MMMM D, YYYY"
							)
					  ] = [response.data.appointments[index]]);
			}

			setAppointmentsMap(appointmentSlots);
			setAppointments(response.data.appointments);
		};
		getAppointments();
	}, [page, adding, searchValue, familyDoctor, sort]);

	const getDistanceLatLon = (latitude1, longitude1, latitude2, longitude2) => {
		console.log(
			"atitude1, longitude1, latitude2, longitude2",
			latitude1,
			longitude1,
			latitude2,
			longitude2
		);
		let earthRadius = 6371;
		let dLat = deg2rad(latitude2 - latitude1);
		let dLon = deg2rad(longitude2 - longitude1);
		let a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(deg2rad(latitude1)) *
				Math.cos(deg2rad(latitude2)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		let d = earthRadius * c;
		return d;
	};
	const deg2rad = (degrees) => {
		return (degrees * Math.PI) / 180;
	};
	const getAvailableSpecialities = (availableDoctors) => {
		let types = {
			family: [],
			specialists: [],
			types: {},
		};
		for (let i in availableDoctors) {
			if (availableDoctors[i].type === "specialist") {
				types.specialists.push(availableDoctors[i]);
				types.types[availableDoctors[i].speciality] = true;
			} else {
				types.family.push(availableDoctors[i]);
				types.types["Internal Medicine"] = true;
			}
		}

		return types;
	};
	const addEvent = async (title, description, start, end, map) => {
		const body = {
			title,
			description,
			start,
			end,
			map,
		};
		const response = await axios.post(
			`${url}/create-appointment/${doctor}`,
			body,
			{
				header: {
					"Content-Type": "application/json",
				},
			}
		);
		setAdding(false);
		navigate(
			`/appointments/${patient._id}_${
				moment.utc(moment(response.data.newAppointment.start))._i
			}`
		);
	};
	const search = (key, word) => {};
	const pickDay = (e) => {
		moment(new Date()).format("MMM Do YY") ===
		moment(new Date(e)).format("MMM Do YY")
			? setDateState(new Date())
			: setDateState(e);
	};
	const openAddEvent = (e) => {
		doctor ? setAdding(true) : navigate("/doctors");
	};
	const familyDrRequest = async (p, d) => {
		const body = {
			patient: p,
			doctor: d,
		};
		const response = await axios.post(`${url}/user/family-doctor`, body, {
			header: {
				"Content-Type": "application/json",
			},
		});
		return response;
	};
	const retreatFamilyRequest = async (p, d) => {
		const body = {
			patient: p,
			doctor: d,
		};
		const response = await axios.post(
			`${url}/user/family-doctor-remove`,
			body,
			{
				header: {
					"Content-Type": "application/json",
				},
			}
		);
		return response;
	};

	return (
		<AppointmentProvider
			value={{
				url,
				page,
				sort,
				side,
				title,
				adding,
				doctor,
				doctors,
				patient,
				allSlots,
				slotsMap,
				isActive,
				currYear,
				dateState,
				currMonth,
				leftRange,
				welcomeMsg,
				searchType,
				doctorInfo,
				rightRange,
				description,
				searchValue,
				calendarMap,
				calendarRef,
				searchIsOpen,
				familyDoctor,
				appointments,
				specialities,
				leftCurrTime,
				rightCurrTime,
				saveBtnStatus,
				isArrowVisible,
				availableCount,
				avalaibleSlots,
				appointmentsMap,
				unavailableSlots,
				setSort,
				search,
				pickDay,
				setSide,
				setTitle,
				setPage,
				addEvent,
				setDoctor,
				setAdding,
				setDoctors,
				setPatient,
				setCurrYear,
				setSlotsMap,
				setAllSlots,
				setIsActive,
				openAddEvent,
				setDateState,
				setCurrMonth,
				setLeftRenge,
				setDoctorInfo,
				setRightRenge,
				setSearchType,
				setWelcomeMsg,
				setSearchValue,
				setDescription,
				setCalendarMap,
				setCalendarRef,
				setFamilyDoctor,
				setSearchIsOpen,
				familyDrRequest,
				setSpecialities,
				setLeftCurrTime,
				setRightCurrTime,
				setSaveBtnStatus,
				setIsArrowVisible,
				setAvailableCount,
				setAvalaibleSlots,
				setUnavailableSlots,
				retreatFamilyRequest,
			}}
		>
			{children}
		</AppointmentProvider>
	);
};
