import {
  collection,
  addDoc,
  writeBatch,
  doc,
  query,
  where,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";

export const submitBookingBatch = async (db, user, formData, locations) => {
  if (!user) throw new Error("Not authenticated");

  if (!formData.eventName || locations.length === 0) {
    throw new Error("Invalid booking data");
  }

  const batch = writeBatch(db);
  const bookingId = await generateBookingId(db);
  const groupId = uuidv4();

  for (const locationName of locations) {
    const sortableDate = dayjs(formData.date).format("YYYY-MM-DD");
    const customId = `${sortableDate}_${formData.eventName.replace(/\s+/g, "")}_${locationName.replace(/\s+/g, "")}`;
    const newDocRef = doc(db, "bookings", customId);
    batch.set(newDocRef, {
      ...formData,
      id: customId,
      location: locationName,
      status: "Pending",
      userNotified: false, // Track if decision email has been sent
      requestedByEmail: user.email,
      requestedByName: formData.fullName,
      requestedAt: new Date().toISOString(),
      groupId: groupId,
      bookingId: bookingId,
    });
  }
  await batch.commit();
  return { groupId, bookingId };
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
    const [year, month, day] = formData.date.split("-");
    const displayDate = `${day}-${month}-${year}`;
    // Get all users who are admins
    const adminsQuery = query(
      collection(db, "users"),
      where("role", "==", "admin"),
    );
    const adminsSnapshot = await getDocs(adminsQuery);

    const adminEmails = adminsSnapshot.docs.map((doc) => doc.data().email);

    if (adminEmails.length === 0) {
      return;
    }

    // Send email to each admin
    const mailPromises = adminEmails.map((email) =>
      addDoc(collection(db, "mail"), {
        to: email,
        message: {
          subject: `Action Required: Review Booking #${bookingId}`,
          replyTo: formData.email,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #f4f7f9; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 20px auto; max-width: 600px; border-radius: 12px; border: 1px solid #e0e6ed; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
    
    /* Hero Image Styling */
    .hero-container { width: 100%; line-height: 0; }
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }

    /* --- Progress Bar (Admin Version) --- */
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
    .detail-row td { border-bottom: 1px solid #f0f0f0; padding: 12px 0; font-size: 14px; }
    .label { color: #777777; text-align: left; width: 40%; }
    .value { color: #222222; font-weight: 600; text-align: right; }

    /* Button Styling */
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
          <tr>
            <td>
              <div class="progress-track">
                <div class="progress-fill"></div>
              </div>
            </td>
          </tr>
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
        <p style="margin:0; font-size: 14px; color: #64748b;">Reference: #${bookingId}</p>
      </div>

      <div class="content">
        <p>Assalam o Alaikum,</p>
        <p>A new booking request has been submitted by <strong>${formData.fullName}</strong>.</p>
        
        <table class="detail-table">
          <tr class="detail-row">
            <td class="label">Event Name</td>
            <td class="value">${formData.eventName}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Locations</td>
            <td class="value">${formData.locations.join(", ")}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Date<br><small style="font-weight: normal;">Time</small></td>
            <td class="value">${displayDate}<br><small style="font-weight: normal;">${formData.timeRange}</small></td>
          </tr>
          <tr class="detail-row">
            <td class="label">Contact</td>
            <td class="value">${formData.phoneNumber}<br><small style="font-weight: normal;">${formData.email}</small></td>
          </tr>
          <tr class="detail-row">
            <td class="label">Jamaat</td>
            <td class="value">${formData.jamaat || "N/A"}</td>
          </tr>
        </table>

        <div class="btn-container">
          <a href="https://booking-baitussalam.web.app/all-bookings?id=${bookingId}" class="btn">
            Review Booking
          </a>
        </div>
      </div>

      <div class="footer">
        <p>&copy; 2026 Bait us Salam Booking Portal<br>Internal Admin Notification</p>
      </div>
    </div>
  </div>
</body>
</html>

      `,
        },
      }),
    );

    await Promise.all(mailPromises);
  } catch (error) {}
};

//----------------------------------------------------------------------------
//SEND Update to Requestor in User Manager (initiated by Admin click) upon booking decision made
//----------------------------------------------------------------------------

export const sendFinalConfirmation = async (db, group, user) => {
  try {
    const [year, month, day] = group.date.split("-");
    const displayDate = `${day}-${month}-${year}`;

    // 1. Fetch all users from your "users" collection for the subscriber list
    const usersRef = collection(db, "users");
    const userSnap = await getDocs(usersRef);

const subscriberEmails = userSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((u) => u.role === "subscriber" || u.role === "admin") // ONLY get subscribers and admins
      .map((u) => u.email || u.id);

    const approverNote = group.bookings[0]?.approverNote || "";

    // Generate the HTML list of statuses for the requested locations
    const locationListHtml = group.bookings
      .map(
        (b) => `
        <li style="margin-bottom: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; list-style: none;">
          <strong style="color: #333;">${b.location}:</strong> 
          <span style="color: ${b.status === "Approved" ? "#2e7d32" : "#d32f2f"}; font-weight: bold; text-transform: uppercase; font-size: 0.85rem;">
            ${b.status}
          </span>
          ${b.rejectionReason ? `<br/><small style="color: #666; font-style: italic;">Note: ${b.rejectionReason}</small>` : ""}
        </li>`,
      )
      .join("");

    // --- SUBSCRIBER TEMPLATE (Exact Copy) ---
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
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .label { color: #777777; font-weight: 500; }
    .value { color: #1a1a1a; font-weight: 600; text-align: right; }
    .info-grid { background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .note-box { background-color: #f9fbff; border-radius: 8px; padding: 15px; margin-top: 25px; border-left: 4px solid #2e7d32; }
    .note-label { display: block; color: #2e7d32; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
    .note-text { margin: 0; color: #444; font-style: italic; font-size: 14px; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #999999; text-transform: uppercase; letter-spacing: 1px; }
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
          <tr><td class="step-text" align="left">Received</td><td class="step-text active" align="right">Finalised</td></tr>
        </table>
      </div>
      <div class="header">
        <div style="color: #8898aa; font-size: 12px; margin-bottom: 5px; font-weight: 500;">Reference: #${group.bookingId}</div>
        <h2 style="color:#2e7d32;">Booking Finalised</h2>
      </div>
      <div class="content">
        <div class="intro-box">
          <p style="margin: 0; font-size: 14px; color: #666;">Assalam o Alaikum,</p>
          <p style="margin: 10px 0 0 0; font-size: 15px; line-height: 1.5;">
            The review process for the following request is now complete.
          </p>
        </div>

        <div class="info-grid">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 5px 0; font-size: 13px; color: #777;">Event Name:</td>
              <td style="padding: 5px 0; font-size: 13px; color: #1a1a1a; font-weight: 600; text-align: right;">${group.eventName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 13px; color: #777;">Date:</td>
              <td style="padding: 5px 0; font-size: 13px; color: #1a1a1a; font-weight: 600; text-align: right;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; font-size: 13px; color: #777;">Requested By:</td>
              <td style="padding: 5px 0; font-size: 13px; color: #1a1a1a; font-weight: 600; text-align: right;">${group.requestedByName}</td>
            </tr>
                        <tr>
              <td style="padding: 5px 0; font-size: 13px; color: #777;">Jamaat:</td>
              <td style="padding: 5px 0; font-size: 13px; color: #1a1a1a; font-weight: 600; text-align: right;">${group.jamaat}</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 5px; letter-spacing: 1px;">Outcome per Location</h3>
        <table class="detail-table">${locationListHtml}</table>


        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">
            The requester has been notified. No further action is required from subscribers at this time.
          </p>
        </div>
      </div>
      <div class="footer">
        <p>&copy; 2026 Bait us Salam Booking Portal</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // --- REQUESTOR TEMPLATE (Exact Copy) ---
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
    
            /* Hero Image Styling */
    .hero-container { width: 100%; line-height: 0; } /* line-height: 0 removes the small white gap below image */
    .hero-img { width: 100%; height: auto; display: block; border-top-left-radius: 12px; border-top-right-radius: 12px; }

    /* --- Progress Bar Styles --- */
    .progress-section { padding: 30px 40px 10px 40px; }
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; position: relative; width: 100%; }
    
    /* SUCCESS STATE: Width 100% and Green color */
    .progress-fill { background-color: #2e7d32; height: 8px; border-radius: 10px; width: 100%; }
    
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 50%; }
    
    /* SUCCESS STATE: Confirmed is now active */
    .active { color: #2e7d32; font-weight: bold; }
    
    .header { padding: 20px; text-align: center; }
    .content { padding: 0 40px 20px; color: #333333; }
    
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .detail-row td { border-bottom: 1px solid #f0f0f0; padding: 12px 0; font-size: 14px; }
    .label { color: #777777; text-align: left; }
    .value { color: #222222; font-weight: 600; text-align: right; }
    
    .note-box { background-color: #f9fbff; border-radius: 8px; padding: 20px; margin-top: 25px; border-left: 4px solid #2e7d32; }
    .note-label { display: block; color: #2e7d32; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px; }
    .note-text { margin: 0; color: #444; font-style: italic; font-size: 14px; line-height: 1.5; }

    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999999; }
    h2 { color: #1a1a1a; margin-top: 10px; margin-bottom: 5px; }
    p { line-height: 1.6; color: #555555; }
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
          <tr>
            <td>
              <div class="progress-track">
                <div class="progress-fill"></div>
              </div>
            </td>
          </tr>
        </table>
        <table class="step-labels">
          <tr>
            <td class="step-text" align="left">Received</td>
            <td class="step-text active" align="right">Finalised</td>
          </tr>
        </table>
      </div>

      <div class="header">
        <div style="color: #8898aa; font-size: 12px; margin-bottom: 5px; font-weight: 500;">Reference: #${group.bookingId}</div>
        <h2 style="color:#2e7d32;">Booking Finalised</h2>
      </div>

      <div class="content">
  
        
                <p style="margin:0; font-size: 15px; color: #555;">Assalam o Alaikum, <strong>${group.requestedByName}</strong></p>
      </div>

      <div class="content">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 10px;">Your request for <strong>${group.eventName}</strong> on <strong>${displayDate}</strong> from <strong>${group.fromTime}-${group.toTime}</strong> has been fully processed. Here is the final status for each location:</p>
        
        <table class="detail-table">
          ${locationListHtml}
        </table>

        ${
          approverNote
            ? `
        <div class="note-box">
          <span class="note-label">Message from Reviewer</span>
          <p class="note-text">"${approverNote}"</p>
        </div>
        `
            : ""
        }

        <div style="margin-top: 30px; padding: 15px; border: 1px dashed #e0e6ed; border-radius: 8px; text-align: center; background-color: #fcfcfc;">
            <p style="margin: 0; font-size: 13px; color: #555;">
              <strong>What happens next?</strong><br>
              If your status is "Approved", your booking is now secured. For any rejections, feel free to contact:           <div style="margin-top: 10px; font-size: 13px;">
            <strong>Mubarik Minhas:</strong> 0468 727 929<br>
            <strong>Ansar Shareef:</strong> 0426 714 215
          </div>
            </p>
        </div>
      </div>

      <div class="footer">
        <p>&copy; 2026 Bait us Salam Booking Portal<br>This is an automated message. Please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // 2. Queue Email to Requestor
    await addDoc(collection(db, "mail"), {
      to: group.requestedByEmail,
      message: {
        subject: `Booking Request Update: ${group.bookingId} - ${group.eventName}`,
        html: requestorHtml,
      },
    });

    // 3. Queue Email to Subscribers (using BCC)
    await addDoc(collection(db, "mail"), {
      to:"bookings.baitussalam@gmail.com",
      bcc:subscriberEmails,
      message: {
        subject: `[Subscriber Update] Booking Finalised: ${group.bookingId} - ${group.eventName}`,
        html: subscriberHtml,
      },
    });

    // 4. Update the Database Status using a Batch Update
    const batch = writeBatch(db);
    group.bookings.forEach((b) => {
      const ref = doc(db, "bookings", b.id);
      batch.update(ref, {
        userNotified: true,
        notifiedAt: new Date().toISOString(),
        actionByEmail: user?.email || "System",
        actionByName: user?.displayName || user?.email || "Admin",
      });
    });

    await batch.commit();
    console.log("Success: Both emails queued and database updated.");
  } catch (error) {
    console.error("Critical error in sendFinalConfirmation:", error);
    throw error;
  }
};
//----------------------------------------------------------------------------
//SEND Acknowledgement to User upon booking request
//----------------------------------------------------------------------------
export const sendUserAcknowledgement = async (
  db,
  userEmail,
  userName,
  formData,
  bookingId,
) => {
  try {
    const [year, month, day] = formData.date.split("-");
    const displayDate = `${day}-${month}-${year}`;

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
    .progress-track { background-color: #e0e6ed; height: 8px; border-radius: 10px; position: relative; width: 100%; }
    .progress-fill { background-color: #1976d2; height: 8px; border-radius: 10px; width: 50%; }
    .step-labels { width: 100%; margin-top: 10px; border-collapse: collapse; }
    .step-text { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999999; width: 50%; }
    .active { color: #1976d2; font-weight: bold; }
    
    .header { padding: 20px 40px 10px; text-align: left; }
    .content { padding: 0 40px 20px; color: #333333; }
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
    .detail-row td { border-bottom: 1px solid #f0f0f0; padding: 12px 0; font-size: 14px; }
    .label { color: #777777; text-align: left; width: 30%; }
    .value { color: #222222; font-weight: 600; text-align: right; }
    
    .contact-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px; border-left: 4px solid #1976d2; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999999; }
    h2 { color: #1a1a1a; margin: 0 0 5px 0; font-size: 22px; }
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
          <tr>
            <td>
              <div class="progress-track">
                <div class="progress-fill"></div>
              </div>
            </td>
          </tr>
        </table>
        <table class="step-labels">
          <tr>
            <td class="step-text active" align="left">Received</td>
            <td class="step-text" align="right">Finalised</td>
          </tr>
        </table>
      </div>

      <div class="header">
        <h2 style="text-align:center; margin-bottom: 20px; color:#1976d2" >Booking Received</h2>
        <p style="margin:0; font-size: 15px; color: #555;">Assalam o Alaikum, <strong>${userName}</strong></p>
      </div>

      <div class="content">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 10px;">
          We've received your request for <strong>${formData.eventName}</strong>. Your request will be looked at as soon as possible and an email will be sent out to you.
        </p>
        
        <table class="detail-table">
          <tr class="detail-row">
            <td class="label">Booking ID</td>
            <td class="value">#${bookingId}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Location(s)</td>
            <td class="value">${formData.locations.join(", ")}</td>
          </tr>
          <tr class="detail-row">
            <td class="label">Date & Time</td>
            <td class="value">
              ${displayDate}<br>
              <span style="font-weight: normal; color: #666; font-size: 13px;">${formData.fromTime} - ${formData.toTime}</span>
            </td>
          </tr>
          <tr class="detail-row">
            <td class="label">Attendance</td>
            <td class="value">${formData.expectedPeople} People / ${formData.expectedCars} Cars</td>
          </tr>
        </table>

        <div class="contact-box">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #1976d2; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Need an update?</p>
          <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.5;">If you don't receive a confirmation within 2 days, please reach out to:</p>
          <div style="margin-top: 12px; font-size: 14px; line-height: 1.6;">
            <strong>Mubarik Minhas:</strong> 0468 727 929<br>
            <strong>Ansar Shareef:</strong> 0426 714 215
          </div>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated message.<br>Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
        `,
      },
    });
  } catch (error) {
    console.error("Mail error: ", error);
    throw error;
  }
};

