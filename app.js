// js/app.js (Ensure this block sits clearly at the bottom layer of the file)

function initInterfaceListeners() {
    console.log("Binding core interface event listeners...");

    // 1. Core Session Login execution rules block
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            toggleSpinner(true);
            const email = document.getElementById("loginEmail").value.trim();
            const pass = document.getElementById("loginPassword").value;
            try {
                await executeSessionLogin(email, pass);
                createSystemToastNotification("Credentials validated. Handshake authorization success.", "success");
            } catch (error) {
                createSystemToastNotification(`Identity Exception Error: ${error.message}`, "danger");
            }
            toggleSpinner(false);
        });
    }

    // 2. Disconnect authentication routing loops clear down parameters
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            toggleSpinner(true);
            await executeSessionLogout();
            toggleSpinner(false);
        });
    }

    // 3. Navigation rails layout target selector tabs loops listeners routing
    document.querySelectorAll(".nav-link-custom").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const panelId = link.getAttribute("data-target");
            switchActivePanel(panelId);
        });
    });

    // 4. Live Search and Filters setup binding triggers
    const searchInput = document.getElementById("filterSearchInput");
    if (searchInput) searchInput.addEventListener("input", renderInventoryMasterLedgerTable);
    
    const stockState = document.getElementById("filterStockState");
    if (stockState) stockState.addEventListener("change", renderInventoryMasterLedgerTable);
    
    const catSelect = document.getElementById("filterCategorySelector");
    if (catSelect) catSelect.addEventListener("change", renderInventoryMasterLedgerTable);
    
    const deptSelect = document.getElementById("filterDepartmentSelector");
    if (deptSelect) deptSelect.addEventListener("change", renderInventoryMasterLedgerTable);
    
    const dateParam = document.getElementById("filterDateParam");
    if (dateParam) dateParam.addEventListener("input", renderInventoryMasterLedgerTable);

    // 5. Inward manual mutation submission loop pipelines tracking updates 
    const formInward = document.getElementById("formInwardEntry");
    if (formInward) {
        formInward.addEventListener("submit", async (e) => {
            e.preventDefault();
            toggleSpinner(true);
            const itemId = document.getElementById("inwardFormItemId").value;
            const qty = parseInt(document.getElementById("inwardFormQty").value) || 0;
            
            const payload = {
                itemId: itemId,
                type: "IN",
                quantity: qty,
                department: "",
                date: new Date().toISOString().slice(0, 10),
                timestamp: Date.now(),
                user: AppState.userProfile.email,
                remarks: "Manual Desk Entry Input"
            };

            try {
                await writeDocumentToCollection("transactions", payload);
                createSystemToastNotification("Inward balance batch transfer ledger record posted.", "success");
                formInward.reset();
            } catch(err) {
                payload.id = "sb_" + Date.now();
                AppState.transactions.unshift(payload);
            }
            await synchronizeDatabaseMasterCollections();
        });
    }

    // 6. Outward allocation allocation dispatch execution mapping checks
    const formOutward = document.getElementById("formOutwardEntry");
    if (formOutward) {
        formOutward.addEventListener("submit", async (e) => {
            e.preventDefault();
            const itemId = document.getElementById("outwardFormItemId").value;
            const qty = parseInt(document.getElementById("outwardFormQty").value) || 0;
            const dept = document.getElementById("outwardFormDept").value;
            const notes = document.getElementById("outwardFormRemarks").value.trim();

            let target = AppState.items.find(i => i.id === itemId);
            if (target && target.stock < qty) {
                alert("CRITICAL VALIDATION FAILED:\nOperation explicitly rejected. Target volume batch quantity request exceeds available stock ceilings.");
                return;
            }

            toggleSpinner(true);
            const payload = {
                itemId: itemId,
                type: "OUT",
                quantity: qty,
                department: dept,
                date: new Date().toISOString().slice(0, 10),
                timestamp: Date.now(),
                user: AppState.userProfile.email,
                remarks: notes
            };

            try {
                await writeDocumentToCollection("transactions", payload);
                createSystemToastNotification("Outward dispatch allocation parameters logged successfully.", "success");
                formOutward.reset();
            } catch(err) {
                payload.id = "sb_" + Date.now();
                AppState.transactions.unshift(payload);
            }
            await synchronizeDatabaseMasterCollections();
        });
    }

    // 7. Bulk parsing file reader execution pipeline initialization scripts layout
    const bulkIngestBtn = document.getElementById("executeBulkIngestionBtn");
    if (bulkIngestBtn) {
        bulkIngestBtn.addEventListener("click", () => {
            const fileSelectorInput = document.getElementById("bulkUploadCsvInputFile");
            const file = fileSelectorInput.files[0];
            if(!file) return alert("Select standard source CSV schema map files validation spreadsheet target.");
            
            const fileReaderInstance = new FileReader();
            fileReaderInstance.onload = async (event) => {
                const rawTextString = event.target.result;
                const segmentsRowsArray = rawTextString.split("\n");
                let ingestionSuccessCount = 0;

                for (let index = 1; index < segmentsRowsArray.length; index++) {
                    const linePayloadRow = segmentsRowsArray[index].trim();
                    if(!linePayloadRow) continue;
                    
                    const splitColumns = linePayloadRow.split(",");
                    if (splitColumns.length >= 4) {
                        const parsedName = splitColumns[0].trim();
                        const parsedCategory = splitColumns[1].trim();
                        const parsedQty = parseInt(splitColumns[2]) || 0;
                        const parsedThreshold = parseInt(splitColumns[3]) || 0;

                        let targetSKU = AppState.items.find(i => i.name.toLowerCase() === parsedName.toLowerCase());
                        let elementId = targetSKU ? targetSKU.id : "sku_" + Date.now() + index;

                        if (!targetSKU) {
                            const newSkuObject = { name: parsedName, category: parsedCategory, threshold: parsedThreshold, openingStock: 0 };
                            try {
                                await setDocumentPathData("items", elementId, newSkuObject);
                            } catch(e) {
                                newSkuObject.id = elementId;
                                AppState.items.push(newSkuObject);
                            }
                        }

                        const transactionLogPayload = {
                            itemId: elementId,
                            type: "IN",
                            quantity: parsedQty,
                            department: "",
                            date: new Date().toISOString().slice(0,10),
                            timestamp: Date.now(),
                            user: AppState.userProfile.email,
                            remarks: "Bulk Ingestion Pipeline"
                        };
                        
                        try {
                            await writeDocumentToCollection("transactions", transactionLogPayload);
                        } catch(e) {
                            transactionLogPayload.id = "sb_" + Date.now() + index;
                            AppState.transactions.unshift(transactionLogPayload);
                        }
                        ingestionSuccessCount++;
                    }
                }
                
                const summaryNode = document.getElementById("bulkUploadSummaryBlock");
                if (summaryNode) {
                    summaryNode.innerHTML = `<div>INGESTION STREAM RESOLVED...</div><div>Parsed Records Rows Count: ${ingestionSuccessCount} Items</div>`;
                    summaryNode.classList.remove("d-none");
                }
                
                createSystemToastNotification(`Ingestion parsed: ${ingestionSuccessCount} rows mapped.`, "success");
                await synchronizeDatabaseMasterCollections();
            };
            fileReaderInstance.readAsText(file);
        });
    }

    // 8. Admin Global Broadcast System Notice Controls
    const broadcastNoticeBtn = document.getElementById("broadcastNoticeBtn");
    if (broadcastNoticeBtn) {
        broadcastNoticeBtn.addEventListener("click", async () => {
            const textValue = document.getElementById("noticeInputText").value.trim();
            toggleSpinner(true);
            try {
                await setDocumentPathData("settings", "global_notice", { text: textValue });
                createSystemToastNotification("System broadcast banner changed successfully.", "info");
                document.getElementById("noticeInputText").value = "";
            } catch(e) {
                AppState.globalNotice = textValue;
            }
            await synchronizeDatabaseMasterCollections();
        });
    }

    // 9. Admin Banquet Event Creation Controls
    const formEvent = document.getElementById("formEventCreationActionHandler");
    if (formEvent) {
        formEvent.addEventListener("submit", async (e) => {
            e.preventDefault();
            toggleSpinner(true);
            const payload = {
                name: document.getElementById("eventFormName").value.trim(),
                date: document.getElementById("eventFormDate").value,
                pax: parseInt(document.getElementById("eventFormPax").value) || 0,
                requiredItems: document.getElementById("eventFormRequiredItems").value.trim(),
                notes: document.getElementById("eventFormNotes").value.trim()
            };
            try {
                await writeDocumentToCollection("events", payload);
                createSystemToastNotification("Banquet Event Alert Pinned to Registry.", "success");
                formEvent.reset();
                bootstrap.Modal.getInstance(document.getElementById("modalCreateEvent")).hide();
            } catch(err) {
                payload.id = "sb_" + Date.now();
                AppState.events.push(payload);
            }
            await synchronizeDatabaseMasterCollections();
        });
    }

    // 10. Provision new custom operators account entries tracking rules
    const adminCreateUserForm = document.getElementById("adminFormCreateUser");
    if (adminCreateUserForm) {
        adminCreateUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            toggleSpinner(true);
            const email = document.getElementById("adminUserEmail").value.trim();
            const pass = document.getElementById("adminUserPassword").value;
            const role = document.getElementById("adminUserRole").value;
            try {
                await createNewUserCredentials(email, pass, role);
                createSystemToastNotification(`Account provisioned successfully for: ${email}`, "success");
                adminCreateUserForm.reset();
            } catch(err) {
                createSystemToastNotification(`Exception operational failure rules: ${err.message}`, "danger");
            }
            toggleSpinner(false);
        });
    }

    // 11. Core Interface Control Triggers download mapping hooks files
    const downloadExcelBtn = document.getElementById("downloadExcelBtn");
    if (downloadExcelBtn) downloadExcelBtn.addEventListener("click", executeExcelSheetDownload);
    
    const printMatrixBtn = document.getElementById("printMatrixBtn");
    if (printMatrixBtn) printMatrixBtn.addEventListener("click", () => window.print());
    
    // 12. Theme Switching Logic Engine Controls Setup Layout Rules
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const root = document.documentElement;
            if(root.getAttribute("data-bs-theme") === "light") {
                root.setAttribute("data-bs-theme", "dark");
                document.getElementById("themeIcon").innerText = "light_mode";
            } else {
                root.setAttribute("data-bs-theme", "light");
                document.getElementById("themeIcon").innerText = "dark_mode";
            }
        });
    }
}