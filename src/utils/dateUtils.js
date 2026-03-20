import dayjs from "dayjs";

export const generateRecurringDates = (startDate, endDate, type) => {
  let dates = [];
  let current = dayjs(startDate);
  const final = dayjs(endDate);

  // Safety check to prevent infinite loops
  let iterations = 0;
  
  while ((current.isBefore(final) || current.isSame(final)) && iterations < 52) {
    dates.push(current.format("YYYY-MM-DD"));
    
    if (type === "daily") current = current.add(1, "day");
    else if (type === "weekly") current = current.add(1, "week");
    else if (type === "monthly") current = current.add(1, "month");
    
    iterations++;
  }
  return dates;
};