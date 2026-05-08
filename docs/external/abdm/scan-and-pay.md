# Scan and Pay

> Source: ABDM Sandbox V3 Documentation

[Home](https://sandbox.abdm.gov.in/sandbox/v3) / [Documentation](https://sandbox.abdm.gov.in/sandbox/v3/new-documentation) / Scan and Pay## Scan and Pay

Scan and Pay empower a patient to scan a QR code to view pending payments against their ABHA, select the items they want to pay for and make quick digital payments at any point during their patient journey using any PHR application that is powered by this use case. 

## Pre Requisites for participants: 

**Health Information Management System (used by facility) **

- It should be integrated with a common payment gateway either owned by the facility or the HMIS at a centralized level. 
- It should be at least M3 integrated.
- It should have Integrated with Scan and Pay APIs.
- The Backend and front-end UI need to be developed ensuring the availability of all functionalities per the test cases document. 
**Personal Health Application (used by the patient) **

- It should be at least M2 integrated
- It should have Integrated with Scan and Pay APIs 
- The Backend and front-end UI needs to be developed ensuring the availability of all functionalities per the test cases document. 
## Functional Flow: 

- A user uses a PHR application to scan the QR code (same as the Scan and Share QR code) at the facility/ lab/ pharmacy. 
- The patient selects the option of ‘make payment’ to proceed with payment which is enabled if access is given to the facility post successful integration. 
- Patients are able to view all the open orders against their ABHA. 
- Patients can select the services or medicines they wish to initiate payment for and click on “pay”. 
- They complete the payment on the Payment Gateway (common PG owned by facility or the HMIS whichever is integrated with Scan and Pay) using any of the payment methods available such as UPI, debit card, wallets etc. 
- After successful payment, the user can view and download the official receipt that is valid and accepted by the facility (having facility name , logo, UID etc.) 
- The patient shows the receipt to the relevant health worker in the facility to avail the services they have paid for. 
- The patients can view their payment history details and check for refund status if any via the transaction history section in the PHR app.
![scan and pay tech flow image.JPG](https://sandboxcms.abdm.gov.in/uploads/scan_and_pay_tech_flow_image_3aa492dd91.JPG)

## Initiate integration with Scan and Pay: 

- Access the postman collection from - https://sandbox.abdm.gov.in/sandbox/v3/new-documentation?doc=scan-and-pay 
- Understand the functionality, its details and envisioned flow from the given information. 
- Connect with the NHA team on regular calls for doubt clarification, testing and issue resolution. 
- Post successful testing on sandbox, production access can be requested by the team. 
- Provide a demo of positive and negative flows to the scan and pay team. 
- Request access for the facility where the functionality is to be rolled out. 
- Post production access, Scan and Pay is live. 
## Pre-requisites for better adoption of the functionality: 

**Health Facility **

- Ensure there is availability of good internet connectivity or a public Wi-Fi 
- Availability of required hardware such as desktops or screens for the staff to view payment confirmations 
- Familiarity of the functionality at the staff level 
- Presence of resources in the facility to guide the patients 
**Patient/User **

- Should own a smart phone 
- Should have a PHR application which is integrated with Scan & Pay 
- Should be able to pay through at least one digital payment methods.
## API Sequence:

| S.no | API | Purpose | URL |
| 1. | SHARE_OPEN_ORDER (with callback) | Initiated by the PHR application to pass intent for Scan and Pay and request open orders from HMIS/LMIS |
| 2. |
| 3. | PATIENT_ SELECTION (with callback) | Initiated by PHR upon selection of open orders by the user for creation of payment link and invoice |
| 4.  | Initiated by HMIS/LMIS to share the final payment orders with the payment gateway URL for payment procedure |
| 5.  |
| 6. | PATIENT_SHARE_ON_NOTIFY | Initiated by the PHR application to confirm that the payment status has been received |
| 7. | PATIENT_SHARE_ORDER_STATUS | Initiated by the PHR application to check the status of payment in case the /NOTIFY call is not received within a stipulated time |
| 8. | PATIENT_SHARE_ON_ORDER_STATUS | Initiated by the PHR application to acknowledge receipt of the payment status |
