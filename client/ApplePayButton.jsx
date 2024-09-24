import React, { useEffect, useState } from "react";

const ApplePayButton = () => {
  const [applePayEligible, setApplePayEligible] = useState(false);

  useEffect(() => {
    const setupApplePay = async () => {
      // Ensure PayPal and Apple Pay SDKs are loaded
      if (
        window.ApplePaySession?.supportsVersion(4) &&
        window.ApplePaySession?.canMakePayments() &&
        window.paypal?.Applepay
      ) {
        const applepay = window.paypal.Applepay();
        const config = await applepay.config();

        const {
          isEligible,
          countryCode,
          currencyCode,
          merchantCapabilities,
          supportedNetworks,
        } = config;

        if (!isEligible) {
          console.error("Apple Pay is not eligible");
          return;
        }

        setApplePayEligible(true);

        const onClick = async () => {
          const paymentRequest = {
            countryCode: countryCode || "GB",
            currencyCode: currencyCode || "GBP",
            merchantCapabilities: merchantCapabilities || ["supports3DS"],
            supportedNetworks: supportedNetworks || [
              "visa",
              "masterCard",
              "amex",
            ],
            requiredBillingContactFields: [
              "name",
              "phone",
              "email",
              "postalAddress",
            ],
            requiredShippingContactFields: [],
            total: {
              label: "Demo (Card is not charged)",
              amount: "10.00", // Adjust dynamically as needed
              type: "final",
            },
          };

          let session = new window.ApplePaySession(4, paymentRequest);

          session.onvalidatemerchant = async (event) => {
            try {
              const payload = await applepay.validateMerchant({
                validationUrl: event.validationURL,
              });
              session.completeMerchantValidation(payload.merchantSession);
            } catch (err) {
              console.error("Merchant validation failed", err);
              session.abort();
            }
          };

          session.onpaymentmethodselected = () => {
            session.completePaymentMethodSelection({
              newTotal: paymentRequest.total,
            });
          };

          session.onpaymentauthorized = async (event) => {
            try {
              // Create Order on the Server Side
              const orderResponse = await fetch(`/applepay/api/orders`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  // Optionally pass cart details here
                }),
              });

              if (!orderResponse.ok) {
                throw new Error("Error creating order");
              }

              const { id } = await orderResponse.json();

              // Confirm Payment with PayPal
              await applepay.confirmOrder({
                orderId: id,
                token: event.payment.token,
                billingContact: event.payment.billingContact,
                shippingContact: event.payment.shippingContact,
              });

              // Capture Order
              const captureResponse = await fetch(
                `/applepay/api/orders/${id}/capture`,
                {
                  method: "POST",
                }
              );

              if (!captureResponse.ok) {
                throw new Error("Error capturing payment");
              }

              // Complete the payment successfully
              session.completePayment({
                status: window.ApplePaySession.STATUS_SUCCESS,
              });

              // Optionally, notify the user of success
              alert("Payment successful!");
            } catch (err) {
              console.error("Payment authorization failed", err);
              session.completePayment({
                status: window.ApplePaySession.STATUS_FAILURE,
              });
            }
          };

          session.oncancel = () => {
            console.log("Apple Pay cancelled");
          };

          session.begin();
        };

        // Set up the button event listener
        const button = document.getElementById("btn-appl");
        button?.addEventListener("click", onClick);

        // Clean up the event listener on unmount
        return () => {
          button?.removeEventListener("click", onClick);
        };
      } else {
        console.warn("Apple Pay is not supported on this device/browser.");
      }
    };

    setupApplePay().catch(console.error);
  }, []);

  if (!applePayEligible) {
    return <p>Apple Pay is not supported on this device.</p>;
  }

  return (
    <div id="applepay-container">
      <apple-pay-button
        id="btn-appl"
        buttonstyle="black"
        type="buy"
        locale="en"></apple-pay-button>
    </div>
  );
};

export default ApplePayButton;
