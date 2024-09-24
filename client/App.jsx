import React, { useState } from "react";
import {
  PayPalScriptProvider,
  usePayPalCardFields,
  PayPalCardFieldsProvider,
  PayPalButtons,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
} from "@paypal/react-paypal-js";
import ApplePayButton from "./ApplePayButton"; // Import the ApplePayButton component

export default function App() {
  const [isPaying, setIsPaying] = useState(false);
  const initialOptions = {
    "client-id":
      "AYOeyCQvilLVKJGjslZfFSi_Nkl7A6OfXNarj5lS55iUcQXMhpp3AypVjAVkS_qvPcO5D415b9SnBFuN",
    "enable-funding": "venmo",
    "disable-funding": "",
    "buyer-country": "US",
    currency: "USD",
    "data-page-type": "product-details",
    components: "buttons,card-fields",
    "data-sdk-integration-source": "developer-studio",
  };

  const [billingAddress, setBillingAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    adminArea1: "",
    adminArea2: "",
    countryCode: "",
    postalCode: "",
  });

  function handleBillingAddressChange(field, value) {
    setBillingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function createOrder() {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Pass additional order information if needed
        body: JSON.stringify({
          cart: [
            {
              sku: "1blwyeo8",
              quantity: 2,
            },
          ],
        }),
      });

      const orderData = await response.json();

      if (orderData.id) {
        return orderData.id;
      } else {
        const errorDetail = orderData?.details?.[0];
        const errorMessage = errorDetail
          ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
          : JSON.stringify(orderData);

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      return `Could not initiate PayPal Checkout...${error}`;
    }
  }

  async function onApprove(data, actions) {
    try {
      const response = await fetch(`/api/orders/${data.orderID}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const orderData = await response.json();
      // Handle different transaction scenarios
      const transaction =
        orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
        orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
      const errorDetail = orderData?.details?.[0];

      if (
        errorDetail?.issue === "INSTRUMENT_DECLINED" &&
        !data.card &&
        actions
      ) {
        // Recoverable error
        return actions.restart();
      } else if (
        errorDetail ||
        !transaction ||
        transaction.status === "DECLINED"
      ) {
        // Non-recoverable error
        let errorMessage;
        if (transaction) {
          errorMessage = `Transaction ${transaction.status}: ${transaction.id}`;
        } else if (errorDetail) {
          errorMessage = `${errorDetail.description} (${orderData.debug_id})`;
        } else {
          errorMessage = JSON.stringify(orderData);
        }

        throw new Error(errorMessage);
      } else {
        // Successful transaction
        console.log(
          "Capture result",
          orderData,
          JSON.stringify(orderData, null, 2)
        );
        alert(
          `Transaction ${transaction.status}: ${transaction.id}. See console for details.`
        );
        return `Transaction ${transaction.status}: ${transaction.id}.`;
      }
    } catch (error) {
      alert(`Sorry, your transaction could not be processed...${error}`);
      return `Sorry, your transaction could not be processed...${error}`;
    }
  }

  function onError(error) {
    console.error("PayPal Buttons Error:", error);
    // Handle the error as needed
  }

  return (
    <PayPalScriptProvider options={initialOptions}>
      <div className="App">
        <h3>Sample PayPal and Apple Pay Integration</h3>
        <h6>PayPal Buttons</h6>
        <PayPalButtons
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          style={{
            shape: "pill",
            layout: "vertical",
            color: "blue",
            label: "paypal",
          }}
        />

        <h6>PayPal Hosted Fields (Credit Card)</h6>
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onApprove}
          onError={(err) => {
            console.error("PayPal Card Fields Error:", err);
            // Redirect or handle the error as needed
            window.location.assign("/your-error-page-here");
          }}
          style={{
            input: {
              fontSize: "16px",
              fontFamily: "courier, monospace",
              fontWeight: "lighter",
              color: "#ccc",
            },
            ".invalid": { color: "purple" },
          }}>
          <PayPalNameField
            style={{
              input: { color: "blue" },
              ".invalid": { color: "purple" },
            }}
          />
          <PayPalNumberField />
          <PayPalExpiryField />
          <PayPalCVVField />

          <input
            type="text"
            id="card-billing-address-line-1"
            name="card-billing-address-line-1"
            placeholder="Address line 1"
            onChange={(e) =>
              handleBillingAddressChange("addressLine1", e.target.value)
            }
          />
          <input
            type="text"
            id="card-billing-address-line-2"
            name="card-billing-address-line-2"
            placeholder="Address line 2"
            onChange={(e) =>
              handleBillingAddressChange("addressLine2", e.target.value)
            }
          />
          <input
            type="text"
            id="card-billing-address-admin-area-line-1"
            name="card-billing-address-admin-area-line-1"
            placeholder="Admin area line 1"
            onChange={(e) =>
              handleBillingAddressChange("adminArea1", e.target.value)
            }
          />
          <input
            type="text"
            id="card-billing-address-admin-area-line-2"
            name="card-billing-address-admin-area-line-2"
            placeholder="Admin area line 2"
            onChange={(e) =>
              handleBillingAddressChange("adminArea2", e.target.value)
            }
          />
          <input
            type="text"
            id="card-billing-address-country-code"
            name="card-billing-address-country-code"
            placeholder="Country code"
            onChange={(e) =>
              handleBillingAddressChange("countryCode", e.target.value)
            }
          />
          <input
            type="text"
            id="card-billing-address-postal-code"
            name="card-billing-address-postal-code"
            placeholder="Postal/zip code"
            onChange={(e) =>
              handleBillingAddressChange("postalCode", e.target.value)
            }
          />

          {/* Custom client component to handle card fields submission */}
          <SubmitPayment
            isPaying={isPaying}
            setIsPaying={setIsPaying}
            billingAddress={billingAddress}
          />
        </PayPalCardFieldsProvider>

        <h6>Apple Pay Button</h6>
        <ApplePayButton />
      </div>
    </PayPalScriptProvider>
  );
}

const SubmitPayment = ({ isPaying, setIsPaying, billingAddress }) => {
  const { cardFieldsForm } = usePayPalCardFields();

  const handleClick = async () => {
    if (!cardFieldsForm) {
      const childErrorMessage =
        "Unable to find any child components in the <PayPalCardFieldsProvider />";

      throw new Error(childErrorMessage);
    }
    const formState = await cardFieldsForm.getState();

    if (!formState.isFormValid) {
      return alert("The payment form is invalid");
    }
    setIsPaying(true);

    cardFieldsForm
      .submit({ billingAddress })
      .then(() => {
        setIsPaying(false);
        alert("Payment successful!");
      })
      .catch((err) => {
        console.error("Card Fields Submission Error:", err);
        setIsPaying(false);
      });
  };

  return (
    <button
      className={isPaying ? "btn" : "btn btn-primary"}
      style={{ float: "right", marginTop: "10px" }}
      onClick={handleClick}
      disabled={isPaying}>
      {isPaying ? <div className="spinner tiny">Processing...</div> : "Pay"}
    </button>
  );
};
