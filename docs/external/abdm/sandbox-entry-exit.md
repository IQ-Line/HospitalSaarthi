# Sandbox Entry & Exit

> Source: ABDM Sandbox V3 Documentation

[Home](https://sandbox.abdm.gov.in/sandbox/v3) / [Documentation](https://sandbox.abdm.gov.in/sandbox/v3/new-documentation) / Sandbox Entry & Exit# ABDM Sandbox Journey

### (A) Sandbox  Entry Process

To initiate the ABDM integration process, entities must first register on the ABDM Sandbox environment. Follow these steps to submitting  your application.

[**Click here**](https://sandbox.abdm.gov.in/sandbox/v3/login) to access the ABDM Sandbox application form. Please ensure you provide accurate details for Entity Name, Email Address, Password, Website, Intent to Integrate, and any other required information.

Note:  The Email Address and Password provided during registration will serve as your login credentials for the Sandbox website. These credentials will also be required for submitting the Exit Form. It is recommended to use a designation-based email address (e.g, xyz@entityname.com). Please not that all notifications, updates regarding integrations, and access credentials will be sent exclusively to this registered email address.

By following these steps, you can ensure a seamless registration and integration process with ABDM.

![Sandbox Info.svg](https://sandboxcms.abdm.gov.in/uploads/Sandbox_Info_d9e6e1d6ee.svg)

### (B) Sandbox Exit Process

Post integration of milestones, the following 4-step process will apply for any integrator to exit from the Sandbox. Integrating entity must complete the below steps:

#### Functional Testing

**Step 1a:  **Post completion of integration of milestones, integrating entities must approach the NHA empaneled functional testing agencies for evaluation of their integrated software/application.

Functional & non-functional test cases for the functional evaluation of the integrated software can be found in the below link.

- [**Click here**](new-documentation?doc=TestCases)
*i*List of NHA empaneled functional testing agencies is as below:  

| M/s AKS Information Technology Services Private Limited |
| M/s Avasure Technologies Private Limited |
| M/s AQM Technologies Private Limited |
| M/s Code Decode Labs Private Limited |
| M/s ESF Labs Limited |
| M/s FIME India Pvt. Ltd. |
| M/s Nangia & Co LLP. |
| M/s Oxygen Consulting Services Private Limited |
| M/s Suma Soft Pvt. Ltd. |

The interested integrators are requested to connect with any one of the above agencies for functional and non-functional testing/certification on chargeable basis. The integrators (new and the existing ones) who are not able to get themselves certified by the cut off date will be required to get the testing conducted by any of these agencies only. Please [**click here**](documentation?doc=testing_agencies_contact) for contact details of the above agencies.

For the duration of your interaction with the FT agencies if you face any concerns or have any grievance, please reach out to ABDM Integration team at <integration.support@nha.gov.in>.

Note that the total duration for the functional testing/evaluation should not exceed beyond 7 working  days from the date of onboarding. FT report must be shared with ABDM team during this period.

#### Internal Demo by NHA 

**Step 1b**:  Post successful completion of evaluation process by FT (Functional Testing) agency, FT report(s) are to be submitted to NHA for approval. These FT reports submitted by FT agencies are in the standard template as approved by NHA. No FT report will be accepted if the report is not in the approved format. 
ABDM Integration team will review the FT reports. Upon approval, an internal demo will be scheduled for the integrating agency. This step has been included to ensure that the testing conducted by the FT agencies are as per the defined test-scenarios with all the updated functionalities.

Note that no implementation is accepted for Exit process if the milestone M1 is done using V1/2 APIs. Implementation with only V3 APIs is acceptable for milestone-1.

#### WASA Certification (Website Application Security Assessment) 

**Step 2:** Security testing of the web/mobile application from any STQC or CERT-IN empaneled agency. Applicants are requested to engage with relevant agencies and submit the “Safe-to-Host” certificate to NHA

- Suggestive pointers on infrastructural requirements for security testing clearance can be found in [**document**](https://sandboxcms.abdm.gov.in/uploads/NDHM_Secure_Application_Development_Reference_Document_7f7cb9d235.pdf)
- To view List of CERT-IN empaneled agencies for Safe-to-Host certification please follow below stepsPlease go to the [**link**](https://www.cert-in.org.in/PDF/Empanel_org.pdf)**.**
- Navigate to Cyber Security Assurance tab and select Empanelment by CERT-in from dropdown.
STQC may also reach out to perform validation testing on a few sample applications.

- HTC Approval (Health Tech Committee)
**Step 3:** A final round of approval for application go-live will be sought from the internal team at NHA. Applicants will be required to share the following before the committee:

- Functional testing report for integrations completed
- Safe-to-Host certificate for the application
- Submission of Exit Form on sandbox with required artifacts. Follow below steps for submitting the Exit form on Sandbox.  
Login [**Sandbox**](https://sandbox.abdm.gov.in/sandbox/v3/login) with credentials set at the time of submitting the application. (Username will be the registered email address and password will be as set during the application submission. You may use the feature, 'Forgot Password' functionality in case you do not remember the password set)
- Fill in the milestone for which you have received go ahead for HTC. All all the required details as suggested in the Exit form and attach all the required documents (FT certificate & reports, WASA certificate, Undertaking and GSTIN certificate). Note that hard copy of duly signed 'Undertaking' form must be sent via courier/speed post to NHA office.
- Submit the Exit form  
- Post review of Exit form, demonstration of implemented milestones to HTC will be scheduled.
- Demo to HTC.
#### Production Access

**Step 4:** Once approved, access will be shared for integration in the production environment. Client-id and Secret for PRODUCTION environment will be shared separately on your registered email address. Please note that 'secret' assigned is extremely confidential and should not be shared. 

- Please visit the** **[**FAQ document**](https://sandboxcms.abdm.gov.in/uploads/FAQ_20_11_2025_808a25df64.pdf)** **for production base urls. Once you are ready with the configuration changes in production, you are requested to check your digital transaction flow with the following test facility created by ABDM which is already registered in the production instances. Please proceed to link your software through the multi HRP construct and test for the health records linkage in this test facility. For any support, please write to <abdm.pc13@nha.gov.in>.
Details are mentioned below:

Name of test facility in ABDM prod environment = “Integrator Testing Lab”
Facility-id = IN0110005723
 

- Kindly ensure the partnering HIP is registered on [**Health Facility Registry** ](https://facility.abdm.gov.in/)in order to interface with the ABDM infrastructure.
- Detailed walkthrough on facility registration steps can be found in [**video link** ](https://www.youtube.com/watch?v=lqe-dlQcLIo). Once registered, the HIP will be required to update production access bridge ID in their Health Facility Registry profile – please find all steps demonstrated in [**document**](https://sandboxcms.abdm.gov.in/uploads/Steps_for_linkage_of_a_Verified_Health_Facility_49a6f6b385.pdf)
The application is now expected to be prepared for go-live in respective healthcare facilities.

Please ensure facility staff is well-versed with the new software and is briefed on ABDM building blocks well in advance to assist patients.

## Agency Contact Details

| S.No | Agency Name | Email Address | Contact Number |
| 1. | [M/s AKS Information Technology Services Private Limited](https://www.aksitservices.co.in/) | [info.cert@aksitservices.co.in](https://sandboxcms.abdm.gov.inmailto:info.cert@aksitservices.co.in) | 7290058951 |
| 2. | [M/s Avasure Technologies Private Limited](https://avasuretechnologies.com/) | [jaiveen.mehta@avasuretechnologies.com](https://sandboxcms.abdm.gov.inmailto:jaiveen.mehta@avasuretechnologies.com) | 9820058628 |
| 3. | [M/s AQM Technologies Private Limited](https://aqmtechnologies.com/) | [sanjay.parikh@aqmtechnologies.com](https://sandboxcms.abdm.gov.inmailto:sanjay.parikh@aqmtechnologies.com) | 8291858027 |
| 4. | [M/s  Code Decode Labs Private Limited](http://www.codedecodelabs.com/) | [abdm-cert@codedecodelabs.com](https://sandboxcms.abdm.gov.inmailto:abdm-cert@codedecodelabs.com) | 9011459161 |
| 5. | [M/s ESF Labs Limited](https://www.esflabs.com/) | [sivarama@esflabs.com](https://sandboxcms.abdm.gov.inmailto:sivarama@esflabs.com) | 9963971531 |
| 6. | [M/s FIME India Pvt. Ltd](https://www.fime.com/shop/product/abdm-ayushman-bharat-digital-mission-certification-services-4263#standards) | [salesindia@fime.com](https://sandboxcms.abdm.gov.inmailto:salesindia@fime.com) | 080-43358036 |
| 7. | [M/s Oxygen Consulting Services Private Limited](http://www.o2csv.com/) | [sanjiv.agarwala@o2csv.com](https://sandboxcms.abdm.gov.inmailto:sanjiv.agarwala@o2csv.com) | 9890302009 |
| 8. | [M/s  Nangia & Co. LLP](https://nangia.com/) | [pushpendra.bharambe@nangia.com](https://sandboxcms.abdm.gov.inmailto:pushpendra.bharambe@nangia.com) | 9892950303 |
| 9. | [M/s Suma Soft Pvt. Ltd](https://www.sumasoft.com/) | [abdm@sumasoft.com](https://sandboxcms.abdm.gov.inmailto:abdm@sumasoft.com) | 8828222799 |
