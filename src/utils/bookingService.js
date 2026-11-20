import {
  collection,
  addDoc,
  writeBatch,
  doc,
  query,
  where,
  getDocs,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import dayjs from "dayjs";

//----------------------------------------------------------------------------
// HELPERS
//----------------------------------------------------------------------------

/** Escapes user-typed text before it goes into an HTML email */
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** YYYY-MM-DD -> DD-MM-YYYY (anything else is shown as is) */
const formatDateDMY = (d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d.split("-").reverse().join("-") : d || "";

/** All dates of a booking (recurring bookings use allDates) */
const getBookingDates = (data) =>
  (data.allDates?.length ? data.allDates : [data.date]).filter(Boolean);

/** HTML for the date(s) cell. Single date = plain text, several = stacked list. */
const buildDatesHtml = (dates, itemStyle = "") =>
  dates.length > 1
    ? `<div style="text-align: right;">${dates
        .map(
          (d) =>
            `<div style="margin-bottom: 2px; ${itemStyle}">${formatDateDMY(d)}</div>`,
        )
        .join("")}</div>`
    : `<span style="${itemStyle}">${formatDateDMY(dates[0])}</span>`;

/**
 * Single "jamaat" text saved on every booking (used by lists and emails):
 *   Auxiliary -> "Khuddam, Lajna – Clyde, Cranbourne"
 *   Jamaat    -> "Melbourne, Sydney"
 */
export const buildJamaatLabel = (f) => {
  if (f.organisationType === "auxiliary") {
    return `${(f.auxiliaries || []).join(", ")} – ${(f.majlisNames || []).join(", ")}`;
  }
  if (f.organisationType === "jamaat") {
    return (f.jamaatNames || []).join(", ");
  }
  return f.jamaat || "";
};

/**
 * Label/value rows describing who the booking is for.
 *   Auxiliary booking -> "Auxiliary" row + "Majlis" row
 *   Jamaat booking    -> "Jamaat" row
 *   Older booking     -> falls back to the saved jamaat text
 */
export const getOrganisationRows = (data) => {
  if (data.organisationType === "auxiliary") {
    const rows = [];
    if (data.auxiliaries?.length)
      rows.push({ label: "Auxiliary", value: data.auxiliaries.join(", ") });
    if (data.majlisNames?.length)
      rows.push({ label: "Majlis", value: data.majlisNames.join(", ") });
    if (rows.length) return rows;
  }

  if (data.organisationType === "jamaat" && data.jamaatNames?.length) {
    return [{ label: "Jamaat", value: data.jamaatNames.join(", ") }];
  }

  // Older bookings (or groups that don't carry the new fields): use the saved text
  const text = data.jamaat || "N/A";
  return [{ label: text.includes(" – ") ? "Booked For" : "Jamaat", value: text }];
};

//----------------------------------------------------------------------------
// SUBMIT BOOKING (legacy helper - the booking form currently saves directly)
//----------------------------------------------------------------------------
export const submitBookingBatch = async (db, user, formData, locations) => {
  if (!user) throw new Error("Not authenticated");
  if (!formData.eventName || locations.length === 0) throw new Error("Invalid booking data");

  const bookingId = await generateBookingId(db);
  const sortableDate = dayjs(formData.date).format("YYYY-MM-DD");

  // Create a single unique ID for the entire booking
  const customId = `${sortableDate}_${bookingId}`;
  const newDocRef = doc(db, "bookings", customId);

  const payload = {
    ...formData,
    id: customId,
    locations: locations, // Save the full array here
    // Keep the single jamaat text in sync with the auxiliary/jamaat selection
    jamaat: buildJamaatLabel(formData),
    status: "Pending",
    userNotified: false,
    requestedByEmail: user.email,
    requestedByName: formData.fullName,
    requestedAt: new Date().toISOString(),
    bookingId: bookingId,
    // Ensure allDates is included for the calendar
    allDates: formData.allDates || [formData.date],
  };

  await setDoc(newDocRef, payload);
  return { bookingId, customId };
};

//Generate Booking ID
export const generateBookingId = async (db) => {
  const year = new Date().getFullYear();
  const counterRef = doc(db, "counters", `bookings_${year}`);

  const bookingId = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);

    let next = 1;

    if (!snap.exists()) {
      transaction.set(counterRef, { year, lastNumber: 1 });
    } else {
      next = snap.data().lastNumber + 1;
      transaction.update(counterRef, { lastNumber: next });
    }

    return `${year}-${String(next).padStart(4, "0")}`;
  });

  return bookingId;
};

//----------------------------------------------------------------------------
//SEND Email to All Admins when a booking request is made
//----------------------------------------------------------------------------
export const sendAdminNotification = async (db, formData, bookingId) => {
  try {
    // 1. Dates (recurring bookings list every date)
    const datesListHtml = buildDatesHtml(getBookingDates(formData));

    // 2. Who the booking is for (Auxiliary + Majlis, or Jamaat)
    const organisationRowsHtml = getOrganisationRows(formData)
      .map(
        (r) => `
          <tr class="detail-row">
            <td class="label">${r.label}</td>
            <td class="value">${esc(r.value)}</td>
          </tr>`,
      )
      .join("");

    // 3. Fetch Admin Emails
    const adminsQuery = query(
      collection(db, "users"),
      where("role", "==", "admin"),
    );

    const adminsSnapshot = await getDocs(adminsQuery);
    const adminEmails = adminsSnapshot.docs
      .map((doc) => doc.data().email)
      .filter((email) => !!email);


    if (adminEmails.length === 0) {
      console.warn("No admins found in Firestore 'users' collection with role 'admin'.");
      return;
    }

    // 4. Build the email once (same content for every admin)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f4f7f9; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 20px auto; max-width: 600px; border-radius: 12px; border: 1px solid #e0e6ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .hero-container { width: 100%; line-height: 0; }
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .progress-section { padding: 30px 40px 10px 40px; }
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; width: 100%; }
    .progress-fill { background-color: #00796b; height: 8px; border-radius: 10px; width: 50%; }
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 33.33%; }
    .active-admin { color: #00796b; font-weight: bold; }
    .header { padding: 20px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f0f4f8; }
    .admin-badge { display: inline-block; background-color: #e0f2f1; color: #00796b; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; }
    .content { padding: 20px 40px; color: #333333; }
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .detail-row td { border-bottom: 1px solid #f0f0f0; padding: 12px 0; font-size: 14px; vertical-align: top; }
    .label { color: #777777; text-align: left; width: 40%; }
    .value { color: #222222; font-weight: 600; text-align: right; }
    .btn-container { text-align: center; padding: 30px 0 10px; }
    .btn { background-color: #00796b; color: #ffffff !important; text-decoration: none; padding: 14px 30px; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 15px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999999; }
    h2 { color: #1a1a1a; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="hero-container">
        <img src="https://ahmadiyyatmosques.wordpress.com/wp-content/uploads/2017/11/ahmadiyya-center-melbourne.jpg" alt="Bait us Salam" class="hero-img">
      </div>
      <div class="progress-section">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td><div class="progress-track"><div class="progress-fill"></div></div></td></tr>
        </table>
        <table class="step-labels">
          <tr>
            <td class="step-text active-admin" align="left">New Request</td>
            <td class="step-text" align="right">Finalized</td>
          </tr>
        </table>
      </div>
      <div class="header">
        <span class="admin-badge">Action Required</span>
        <h2>New Booking Request</h2>
        <p style="margin:0; font-size: 14px; color: #64748b;">Reference: #${esc(bookingId)}</p>
      </div>
      <div class="content">
        <p>Assalam o Alaikum,</p>
        <p>A new booking request has been submitted by <strong>${esc(formData.fullName)}</strong>.</p>
        <table class="detail-table">
          <tr class="detail-row">
            <td class="label">Event Name</td>
            <td class="value">${esc(formData.eventName)}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Locations</td>
            <td class="value">${esc((formData.locations || []).join(", "))}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Date(s)</td>
            <td class="value">${datesListHtml}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Time</td>
            <td class="value">${esc(formData.fromTime)} - ${esc(formData.toTime)}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Contact</td>
            <td class="value">${esc(formData.phoneNumber)}<br><small style="font-weight: normal;">${esc(formData.requestedByEmail || "No Email Provided")}</small></td>
          </tr>${organisationRowsHtml}
        </table>
        <div class="btn-container">
          <a href="https://booking-baitussalam.web.app/all-bookings?id=${encodeURIComponent(bookingId)}" class="btn">Review Booking</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; 2026 Bait us Salam Booking Portal<br>Internal Admin Notification</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // 5. Create Mail Documents (replyTo goes to the person who made the request)
    const message = {
      subject: `Action Required: Review Booking #${bookingId}`,
      html,
    };
    if (formData.requestedByEmail) message.replyTo = formData.requestedByEmail;

    const mailPromises = adminEmails.map((email) =>
      addDoc(collection(db, "mail"), { to: email, message }),
    );
    await Promise.all(mailPromises);
  } catch (error) {
    console.error("CRITICAL ERROR in sendAdminNotification:", error);
  }
};

//----------------------------------------------------------------------------
//SEND Update to Requestor upon booking decision made
//----------------------------------------------------------------------------
export const sendFinalConfirmation = async (db, group, user) => {
  try {
    const dates = getBookingDates(group);
    const datesListHtml = buildDatesHtml(
      dates,
      "font-size: 13px; color: #1a1a1a; font-weight: 600;",
    );

    const usersRef = collection(db, "users");
    const userSnap = await getDocs(usersRef);

    const subscriberEmails = [
      ...new Set(
        userSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => u.role === "subscriber" || u.role === "admin")
          .map((u) => u.email || u.id)
          .filter(Boolean),
      ),
    ];

    // The note passed in from the approve/reject dialog is on the group itself;
    // fall back to the first booking in the group for older callers (e.g. Resend)
    const approverNote = group.approverNote || group.bookings?.[0]?.approverNote || "";

    // Name used in the greeting (older bookings don't have requestedByName)
    const requesterName = group.requestedByName || group.fullName || "";

    // Auxiliary + Majlis, or Jamaat
    const organisationRows = getOrganisationRows(group);
    const subscriberOrganisationRowsHtml = organisationRows
      .map(
        (r) =>
          `<tr><td style="padding: 8px 0; font-size: 13px; color: #777; vertical-align: top;">${r.label}:</td><td style="padding: 8px 0; font-size: 13px; color: #1a1a1a; font-weight: 600; text-align: right; vertical-align: top;">${esc(r.value)}</td></tr>`,
      )
      .join("");

    const locationListHtml = (group.locations || [])
      .map((locName) => `
        <tr>
          <td style="padding: 10px 14px; background: #f8f9fa; border: 1px solid #e0e6ed; border-radius: 6px;">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #333;">${esc(locName)}</td>
                <td align="right" style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: ${group.status === "Approved" ? "#2e7d32" : "#d32f2f"};">
                  ${esc(group.status)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height: 8px;"></td></tr>`).join("");

    const subscriberHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f4f7f9; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 20px auto; max-width: 600px; border-radius: 12px; border: 1px solid #e0e6ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .hero-container { width: 100%; line-height: 0; }
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .progress-section { padding: 30px 40px 10px 40px; }
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; width: 100%; }
    .progress-fill { background-color: #2e7d32; height: 8px; border-radius: 10px; width: 100%; }
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 50%; }
    .active { color: #2e7d32; font-weight: bold; }
    .header { padding: 20px; text-align: center; }
    .content { padding: 30px 40px; color: #333333; }
    .intro-box { border-bottom: 2px solid #f0f2f5; margin-bottom: 20px; padding-bottom: 20px; }
    .info-grid { background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 25px; border: 1px solid #e0e6ed; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #999999; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="hero-container"><img src="https://ahmadiyyatmosques.wordpress.com/wp-content/uploads/2017/11/ahmadiyya-center-melbourne.jpg" class="hero-img"></div>
      <div class="progress-section">
        <table width="100%" cellspacing="0" cellpadding="0"><tr><td><div class="progress-track"><div class="progress-fill"></div></div></td></tr></table>
        <table class="step-labels"><tr><td class="step-text" align="left">Received</td><td class="step-text active" align="right">Finalised</td></tr></table>
      </div>
      <div class="header">
        <div style="color: #8898aa; font-size: 12px; margin-bottom: 5px; font-weight: 500;">Reference: #${esc(group.bookingId)}</div>
        <h2 style="color:#2e7d32; margin: 0;">Booking Finalised</h2>
      </div>
      <div class="content">
        <div class="intro-box"><p style="margin: 0; font-size: 14px; color: #666;">Assalam o Alaikum,</p><p style="margin: 10px 0 0 0; font-size: 15px; line-height: 1.5;">The review process for the following request is now complete.</p></div>
        <div class="info-grid">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding: 8px 0; font-size: 13px; color: #777; vertical-align: top;">Event Name:</td><td style="padding: 8px 0; font-size: 13px; color: #1a1a1a; font-weight: 600; text-align: right; vertical-align: top;">${esc(group.eventName)}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 13px; color: #777; vertical-align: top;">Date(s):</td><td style="padding: 8px 0; text-align: right; vertical-align: top;">${datesListHtml}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 13px; color: #777; vertical-align: top;">Requested By:</td><td style="padding: 8px 0; font-size: 13px; color: #1a1a1a; font-weight: 600; text-align: right; vertical-align: top;">${esc(group.fullName)}</td></tr>
            ${subscriberOrganisationRowsHtml}
          </table>
        </div>
        <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; letter-spacing: 1px;">Outcome Per Location</h3>
        <table width="100%" cellspacing="0" cellpadding="0">${locationListHtml}</table>
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">The requester has been notified. No further action is required from subscribers at this time.</p>
        </div>
      </div>
      <div class="footer"><p>&copy; 2026 Bait us Salam Booking Portal</p></div>
    </div>
  </div>
</body>
</html>`;

    const requestorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f4f7f9; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 20px auto; max-width: 600px; border-radius: 12px; border: 1px solid #e0e6ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .hero-container { width: 100%; line-height: 0; }
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .progress-section { padding: 30px 40px 10px 40px; }
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; width: 100%; }
    .progress-fill { background-color: #2e7d32; height: 8px; border-radius: 10px; width: 100%; }
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 50%; }
    .active { color: #2e7d32; font-weight: bold; }
    .header { padding: 20px; text-align: center; }
    .content { padding: 0 40px 20px; color: #333333; }
    .note-box { background-color: #f9fbff; border-radius: 8px; padding: 20px; margin-top: 25px; border: 1px solid #e0e6ed; border-left: 4px solid #2e7d32; }
    .note-label { display: block; color: #2e7d32; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="hero-container"><img src="https://ahmadiyyatmosques.wordpress.com/wp-content/uploads/2017/11/ahmadiyya-center-melbourne.jpg" alt="Bait us Salam" class="hero-img"></div>
      <div class="progress-section">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td><div class="progress-track"><div class="progress-fill"></div></div></td></tr>
        </table>
        <table class="step-labels">
          <tr><td class="step-text" align="left">Received</td><td class="step-text active" align="right">Finalised</td></tr>
        </table>
      </div>
      <div class="header">
        <div style="color: #8898aa; font-size: 12px; margin-bottom: 5px; font-weight: 500;">Reference: #${esc(group.bookingId)}</div>
        <h2 style="color:#2e7d32; margin: 0;">Booking Finalised</h2>
      </div>
      <div class="content">
        <p style="margin:0; font-size: 15px; color: #555;">Assalam o Alaikum, <strong>${esc(requesterName)}</strong></p>
        <p style="font-size: 15px; line-height: 1.6; margin-top: 10px;">Your request for <strong>${esc(group.eventName)}</strong> has been processed for the following dates:</p>
        <div style="background:#f8f9fa; padding:12px 15px; border-radius:8px; margin-bottom:20px; border: 1px solid #e0e6ed;">${datesListHtml}</div>
        
        <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; letter-spacing: 1px;">Outcome Per Location</h3>
        <table width="100%" cellspacing="0" cellpadding="0">${locationListHtml}</table>

        ${approverNote ? `
        <div class="note-box">
          <span class="note-label">Message from Reviewer</span>
          <p style="margin: 0; color: #444; font-style: italic; font-size: 14px;">"${esc(approverNote)}"</p>
        </div>` : ""}
        <div style="margin-top: 30px; padding: 15px; border: 1px dashed #e0e6ed; border-radius: 8px; text-align: center; background-color: #fcfcfc;">
            <p style="margin: 0; font-size: 13px; color: #555;">
              <strong>What happens next?</strong><br>
              If your status is "Approved", your booking is now secured. For any rejections, feel free to contact: 
            </p>
            <div style="margin-top: 10px; font-size: 13px; color: #333;">
              <strong>Mubarik Minhas:</strong> 0468 727 929<br>
              <strong>Ansar Shareef:</strong> 0426 714 215
            </div>
        </div>
      </div>
      <div class="footer"><p>&copy; 2026 Bait us Salam Booking Portal<br>This is an automated message. Please do not reply.</p></div>
    </div>
  </div>
</body>
</html>`;

    if (group.requestedByEmail) {
      await addDoc(collection(db, "mail"), {
        to: group.requestedByEmail,
        message: {
          subject: `Booking Request Update: ${group.bookingId} - ${group.eventName}`,
          html: requestorHtml,
        },
      });
    } else {
      console.warn(`Booking ${group.bookingId} has no requestedByEmail; requester email skipped.`);
    }

    await addDoc(collection(db, "mail"), {
      to: "bookings.baitussalam@gmail.com",
      bcc: subscriberEmails,
      message: {
        subject: `[Subscriber Update] Booking Finalised: ${group.bookingId} - ${group.eventName}`,
        html: subscriberHtml,
      },
    });

    const batch = writeBatch(db);
    const bookingRef = doc(db, "bookings", group.bookingId);

    batch.update(bookingRef, {
      userNotified: true,
      notifiedAt: new Date().toISOString(),
      actionByEmail: user?.email || "System",
      actionByName: user?.displayName || user?.email || "Admin",
    });

    await batch.commit();
  } catch (error) {
    throw error;
  }
};

//----------------------------------------------------------------------------
//SEND Acknowledgement to User upon booking request
//----------------------------------------------------------------------------
export const sendUserAcknowledgement = async (db, userEmail, userName, formData, bookingId) => {
  try {
    const datesListHtml = buildDatesHtml(getBookingDates(formData));

    await addDoc(collection(db, "mail"), {
      to: userEmail,
      message: {
        subject: `Booking Request Received: ${bookingId} - ${formData.eventName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f4f7f9; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 20px auto; max-width: 600px; border-radius: 12px; border: 1px solid #e0e6ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .hero-container { width: 100%; line-height: 0; }
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .progress-section { padding: 30px 40px 10px 40px; }
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; width: 100%; }
    .progress-fill { background-color: #1976d2; height: 8px; border-radius: 10px; width: 50%; }
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 50%; }
    .active { color: #1976d2; font-weight: bold; }
    .header { padding: 20px 40px 10px; text-align: left; }
    .content { padding: 0 40px 20px; color: #333333; }
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
    .detail-row td { border-bottom: 1px solid #f0f0f0; padding: 12px 0; font-size: 14px; vertical-align: top; }
    .label { color: #777777; text-align: left; width: 30%; }
    .value { color: #222222; font-weight: 600; text-align: right; }
    .contact-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px; border-left: 4px solid #1976d2; border: 1px solid #e0e6ed; border-left-width: 4px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999999; }
    h2 { color: #1a1a1a; margin: 0 0 5px 0; font-size: 22px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="hero-container"><img src="https://ahmadiyyatmosques.wordpress.com/wp-content/uploads/2017/11/ahmadiyya-center-melbourne.jpg" class="hero-img"></div>
      <div class="progress-section">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td><div class="progress-track"><div class="progress-fill"></div></div></td></tr>
        </table>
        <table class="step-labels">
          <tr><td class="step-text active" align="left">Received</td><td class="step-text" align="right">Finalised</td></tr>
        </table>
      </div>
      <div class="header">
        <h2 style="text-align:center; margin-bottom: 20px; color:#1976d2" >Booking Received</h2>
        <p style="margin:0; font-size: 15px; color: #555;">Assalam o Alaikum, <strong>${esc(userName)}</strong></p>
      </div>
      <div class="content">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 10px;">We've received your request for <strong>${esc(formData.eventName)}</strong>. It will be reviewed shortly.</p>
        <table class="detail-table">
          <tr class="detail-row"><td class="label">Booking ID</td><td class="value">#${esc(bookingId)}</td></tr>
          <tr class="detail-row"><td class="label">Location(s)</td><td class="value">${esc((formData.locations || []).join(", "))}</td></tr>
          <tr class="detail-row"><td class="label">Date(s)</td><td class="value">${datesListHtml}</td></tr>
          <tr class="detail-row"><td class="label">Time</td><td class="value">${esc(formData.fromTime)} - ${esc(formData.toTime)}</td></tr>
        </table>
        <div class="contact-box">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #1976d2; text-transform: uppercase; font-size: 12px;">Need an update?</p>
          <div style="font-size: 14px; line-height: 1.6;">
            <strong>Mubarik Minhas:</strong> 0468 727 929<br>
            <strong>Ansar Shareef:</strong> 0426 714 215
          </div>
        </div>
      </div>
      <div class="footer"><p>This is an automated message. Please do not reply.</p></div>
    </div>
  </div>
</body>
</html>`,
      },
    });
  } catch (error) { console.error(error); }
};