/**
 * Fictional BPBMC showcase records. No source database or uploaded medical file
 * is used. A fresh, mutable set is returned for each demo reset; the wrapper
 * keeps changes in memory for the current browser page only.
 */
export function createFixtures() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((entry) => entry.type === type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const date = (offset = 0) => {
    const value = new Date(`${today}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  const stamp = (offset = 0, time = '09:00:00') => `${date(offset)} ${time}`;
  const branches = ['Pasig', 'Taytay'];

  const people = [
    ['Mara', 'L.', 'Demo', 28, 'Female', '1998-03-12', 'Regular', 'Verified'],
    ['Noel', 'P.', 'Demo', 34, 'Male', '1992-06-04', 'Regular', 'Verified'],
    ['Elise', 'R.', 'Demo', 24, 'Female', '2002-04-18', 'Regular', 'Verified'],
    ['Carlo', 'S.', 'Demo', 64, 'Male', '1962-07-23', 'Senior Citizen', 'Verified'],
    ['Mina', 'T.', 'Demo', 31, 'Female', '1995-02-14', 'Regular', 'unverified'],
    ['Rafael', 'A.', 'Demo', 26, 'Male', '2000-01-09', 'Regular', 'unverified'],
  ];
  const patients = people.map((person, index) => {
    const [first_name, middle_name, last_name, age, sex, birthdate, patient_type, verification_status] = person;
    const full_name = `${first_name} ${middle_name} ${last_name}`;
    return {
      id: index + 1, patient_id: index + 1, patient_number: `DEMO-P${String(index + 1).padStart(3, '0')}`,
      first_name, middle_name, last_name, suffix: '', full_name, name: full_name,
      full_name_patient: full_name, patient_name: full_name,
      age, sex, gender: sex, birthdate, date_of_birth: birthdate, patient_type,
      email: `${first_name.toLowerCase()}.demo@patients.example`,
      contact_number: `0900 000 000${index + 1}`, phone: `0900 000 000${index + 1}`,
      country: 'Philippines', house_street: `${index + 1} Sample Lane`,
      barangay: 'Demo Barangay', municipality_city: 'Demo City', region: 'Demo Region',
      postal_code: '0000', address: `${index + 1} Sample Lane, Demo Barangay, Demo City`,
      id_type: 'Demo identification', id_number: `DEMO-ID-${index + 1}`,
      verification_status, status: verification_status, isArchived: 'notarchived',
      created: stamp(-12 + index), created_at: stamp(-12 + index), verification_date: stamp(-8 + index),
      clinic_branch: branches[index % branches.length],
    };
  });

  const doctorData = [
    ['Eliana', 'B.', 'General Medicine'], ['Adrian', 'C.', 'Family Medicine'],
    ['Sofia', 'D.', 'Internal Medicine'], ['Gabriel', 'E.', 'Pediatrics'],
  ];
  const doctors = doctorData.map(([first_name, middle_name, specialization], index) => {
    const full_name = `${first_name} ${middle_name} Demo`;
    const name = `Dr. ${full_name}`;
    return {
      id: 101 + index, doctor_id: 101 + index, account_id: 101 + index,
      first_name, middle_name, last_name: 'Demo', full_name, name, doctor: name,
      username: `${first_name.toLowerCase()}.demo`, email: `${first_name.toLowerCase()}.demo@clinic.example`,
      contact_number: `0900 001 000${index + 1}`, role: 'Doctor', specialization,
      clinic_branch: branches[index % branches.length], branch: branches[index % branches.length],
      available: 1, status: 'Active', isArchived: 'notarchived',
      created: stamp(-20 + index), created_at: stamp(-20 + index),
    };
  });
  const staff = ['Luna', 'Nico', 'Clara'].map((first_name, index) => ({
    id: 201 + index, account_id: 201 + index, first_name, middle_name: '', last_name: 'Demo',
    full_name: `${first_name} Demo`, name: `${first_name} Demo`,
    username: `${first_name.toLowerCase()}.demo`, email: `${first_name.toLowerCase()}.demo@clinic.example`,
    contact_number: `0900 002 000${index + 1}`, role: 'Staff', specialization: 'Clinic support',
    clinic_branch: branches[index % branches.length], branch: branches[index % branches.length],
    status: 'Active', available: 1, isArchived: 'notarchived',
    created: stamp(-18 + index), created_at: stamp(-18 + index),
  }));
  const administrator = {
    id: 301, account_id: 301, first_name: 'Alex', middle_name: '', last_name: 'Demo',
    name: 'Alex Demo', full_name: 'Alex Demo', username: 'admin.demo',
    email: 'admin.demo@clinic.example', contact_number: '0900 003 0001', role: 'Admin',
    clinic_branch: 'Pasig', branch: 'Pasig', status: 'Active', available: 1,
    specialization: 'Administration', isArchived: 'notarchived', created: stamp(-30), created_at: stamp(-30),
  };
  const accounts = [administrator, ...doctors, ...staff];

  const appointmentData = [
    [0, 0, 0, '09:00', 'approved'], [1, 1, 0, '10:00', 'approved'],
    [2, 2, 1, '09:30', 'pending'], [3, 3, 2, '11:00', 'pending'],
    [0, 0, 3, '10:30', 'approved'], [4, 1, 4, '13:00', 'pending'],
    [5, 2, 5, '14:00', 'approved'], [1, 3, 6, '09:00', 'approved'],
    [0, 0, -3, '09:00', 'completed'], [2, 2, -5, '10:30', 'completed'],
    [3, 1, -7, '13:30', 'cancelled'], [1, 3, -9, '11:00', 'completed'],
  ];
  const appointments = appointmentData.map(([patientIndex, doctorIndex, offset, time, status], index) => {
    const patient = patients[patientIndex];
    const doctor = doctors[doctorIndex];
    return {
      id: index + 1, appointment_id: index + 1, reference: `DEMO-A${String(index + 1).padStart(3, '0')}`,
      patient_id: patient.id, patient_name: patient.full_name, name: patient.full_name,
      patient_type: patient.patient_type, email: patient.email, patient_email: patient.email,
      contact_number: patient.contact_number, sex: patient.sex, age: patient.age,
      doctor_id: doctor.id, doctor: doctor.name, doctor_name: doctor.name, specialization: doctor.specialization,
      clinic_branch: doctor.clinic_branch, branch: doctor.clinic_branch,
      date: date(offset), time, selected_date: date(offset), selected_time: time, status,
      concern: 'Illustrative appointment for this portfolio demo.', notes: 'Fictional booking — sample data only.',
      created: stamp(offset - 2), created_at: stamp(offset - 2), isArchived: 'notarchived',
    };
  });

  const serviceData = [
    ['Complete Blood Count — Demo', 'Laboratory', 250],
    ['Urinalysis — Demo', 'Laboratory', 150],
    ['Chest X-ray — Demo', 'Imaging', 400],
    ['Ultrasound — Demo', 'Imaging', 900],
    ['Physical Examination — Demo', 'Consultation', 350],
    ['Medical Certificate — Demo', 'Documents', 150],
  ];
  const services = serviceData.map(([name, category, price], index) => ({
    id: index + 1, service_id: index + 1, name, service_name: name, category,
    service_category: category, price, service_price: price, status: 'Active',
    isArchived: 'notarchived', description: 'Illustrative service and amount for interface demonstration only.',
  }));
  const treatmentData = [
    ['General Consultation — Demo', 'Consultation', 500],
    ['Follow-up Visit — Demo', 'Consultation', 350],
    ['Routine Care — Demo', 'Outpatient', 300],
    ['Assessment — Demo', 'Outpatient', 450],
  ];
  const treatments = treatmentData.map(([name, category, price], index) => ({
    id: index + 1, treatment_id: index + 1, name, treatment_name: name, category,
    treatment_category: category, price, treatment_price: price, status: 'Active',
    isArchived: 'notarchived', description: 'Illustrative treatment entry; no medical recommendation.',
  }));

  const records = [0, 1, 2, 3, 0, 1].map((patientIndex, index) => {
    const patient = patients[patientIndex];
    const doctor = doctors[index % doctors.length];
    return {
      id: index + 1, record_id: index + 1, patient_id: patient.id,
      patient_name: patient.full_name, name: patient.full_name, email: patient.email,
      doctor: doctor.name, doctor_id: doctor.id, clinic_branch: doctor.clinic_branch,
      date: date(-3 - index * 2), date_time: stamp(-3 - index * 2), date_lastcheckup: date(-3 - index * 2),
      purpose: 'Demo consultation', consultation_type: 'Illustrative follow-up',
      weight: '60', height: '165', blood_pressure: '120/80', body_temperature: '36.6',
      colds: 'No', fever: 'No', cough: 'No',
      notes: 'Fictional sample record for showing the interface. No real patient information.',
      ClinicNotes: 'Sample entry only — no diagnosis or clinical recommendation.',
      diagnosis: 'Illustrative sample — no clinical diagnosis', treatment: 'Demo entry only',
      status: 'Completed', created_at: stamp(-3 - index * 2),
    };
  });
  const results = [0, 1, 2, 0, 3].map((patientIndex, index) => {
    const patient = patients[patientIndex];
    const doctor = doctors[index % doctors.length];
    return {
      id: index + 1, result_id: index + 1, patient_id: patient.id,
      patient_name: patient.full_name, name: patient.full_name, patient_email: patient.email, email: patient.email,
      result_type: services[index % services.length].name, service_name: services[index % services.length].name,
      doctor: doctor.name, clinic_branch: doctor.clinic_branch,
      date: date(-2 - index), date_upload: stamp(-2 - index), created_at: stamp(-2 - index),
      files_upload: '', filename: '', pdf_file: '', status: 'Available',
      notes: 'Fictional result placeholder. No medical document is included in this showcase.',
    };
  });

  const bills = [0, 1, 2, 0, 3, 4].map((patientIndex, index) => {
    const patient = patients[patientIndex];
    const service = services[index % services.length];
    const treatment = treatments[index % treatments.length];
    const total = service.price + treatment.price;
    const paid = index < 4;
    return {
      id: index + 1, billing_id: index + 1, receipt_id: index + 1,
      reference: `DEMO-B${String(index + 1).padStart(3, '0')}`, invoice_number: `DEMO-B${String(index + 1).padStart(3, '0')}`,
      patient_id: patient.id, patient_name: patient.full_name, name: patient.full_name,
      patient_email: patient.email, email: patient.email, clinic_branch: branches[index % 2],
      date: date(-index), created_at: stamp(-index, '10:30:00'), date_paid: paid ? stamp(-index, '10:45:00') : '',
      service_name: service.name, treatment_name: treatment.name,
      items: [
        { id: `s${service.id}`, name: service.name, service_name: service.name, type: 'Diagnostic', price: service.price, quantity: 1, discount: 0, subtotal: service.price },
        { id: `t${treatment.id}`, name: treatment.name, treatment_name: treatment.name, type: 'Treatment', price: treatment.price, quantity: 1, discount: 0, subtotal: treatment.price },
      ],
      subtotal: total, amount: total, total, total_amount: total, discount: 0,
      paid_amount: paid ? total : 0, payment_status: paid ? 'Paid' : 'Pending', status: paid ? 'Paid' : 'Pending',
      payment_method: paid ? (index % 2 ? 'Demo cash' : 'Demo e-wallet') : 'Not paid',
      account_name: staff[index % staff.length].name, pdf_file: '', receipt_file: '',
      notes: 'Illustrative bill only. No actual payment is processed.',
    };
  });
  const activity = [
    ['Opened dashboard', 'Viewed the sample clinic dashboard.'],
    ['Scheduled appointment', 'Created a fictional demonstration appointment.'],
    ['Reviewed patient account', 'Reviewed a sample patient profile.'],
    ['Updated service catalog', 'Edited an illustrative service entry.'],
    ['Prepared demo billing', 'Prepared an in-memory sample bill.'],
    ['Viewed medical result', 'Opened a fictional result placeholder.'],
  ].map(([action, details], index) => ({
    id: index + 1, action, details, timestamp: stamp(-Math.floor(index / 3), `${String(9 + (index % 3)).padStart(2, '0')}:00:00`),
    created_at: stamp(-Math.floor(index / 3)), user: accounts[index % accounts.length].name,
    account_name: accounts[index % accounts.length].name, role: accounts[index % accounts.length].role,
  }));
  const transactions = bills.map((bill) => ({ ...bill, action: bill.payment_status === 'Paid' ? 'Demo payment recorded' : 'Demo bill prepared' }));
  const session = {
    admin: { ...administrator, user_id: administrator.id, user_role: 'Admin', user_name: administrator.name },
    doctor: { ...doctors[0], user_id: doctors[0].id, user_role: 'Doctor', user_name: doctors[0].name },
    staff: { ...staff[0], user_id: staff[0].id, user_role: 'Staff', user_name: staff[0].name },
    patient: { ...patients[0], user_id: patients[0].id, user_role: 'Patient', user_name: patients[0].name,
      user_first_name: patients[0].first_name, user_middle_name: patients[0].middle_name, user_last_name: patients[0].last_name },
  };
  return {
    today, branches, patients, doctors, staff, accounts, users: accounts,
    appointments, services, treatments, records, medicalRecords: records,
    results, medicalResults: results, bills, receipts: bills, activity, transactions, session,
    serviceCategories: [...new Set(services.map((row) => row.category))].map((category_name, index) => ({ id: index + 1, name: category_name, category_name })),
    treatmentCategories: [...new Set(treatments.map((row) => row.category))].map((category_name, index) => ({ id: index + 1, name: category_name, category_name })),
    demoNotice: 'Fictional data for a portfolio frontend demonstration. Changes reset when the page reloads.',
  };
}

export default createFixtures;
