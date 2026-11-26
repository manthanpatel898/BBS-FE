# Staff Payroll & Leave

Super admin enables the independent **Staff Payroll & Leave add-on** in event company Create/Edit. Default off; existing expense add-on is not required. Company admin gets payroll access; employees require payroll.view, payroll.manage and/or payroll.export as appropriate. Backend rechecks the current company flag on each request. Client entitlement refreshes on app entry/focus.

Open Staff Payroll. Select a month, add staff with monthly salary and optional default hourly rate. Payroll staff do not need login accounts. Main cards show name, salary, overtime, payable, payment state and Add leave / Add overtime. Details holds secondary histories. Leave is only start date + integer1–31days + optional remark; it never reduces salary. Cross-month days are counted in each applicable month.

Overtime accepts an extra rupee amount or hours×rate; recorded amounts/rates are snapshots. Monthly payable is fixed salary plus overtime. Mark paid records a full payment and locks monetary values; it does not send money. Excel export contains all filtered staff up to backend cap10000. Salary changes have effective month; paid statements remain unchanged. Archiving stops future base salary while retaining overtime owed and past paid records. Use Include archived to find and reactivate archived staff through Edit staff; no records are deleted.

Responsive checks use the actual built application shell and sample intercepted APIs at320/390/820/1440widths. Summary, first staff name/payable and leave/overtime actions fit above fold on390×844 and320×744. More staff requires vertical paging/scrolling; histories are opened separately. No sideways scrolling. Inputs/tap actions are at least44px and phone input text16px. No production customer/staff data is used in browser tests.

API contract and backend deployment details: see BBS-BE/docs/modules/staff-payroll.md. Production deployment prepares payroll collections/indexes before backend activation; MongoDB replica-set transactions required. Deploy backend before frontend. No external payment, payroll tax, attendance or leave-allowance automation.
