import "./monitor.styles.scss";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useMonitorMutation from "../../hooks/useMonitorMutation";

const testProductUrl =
  "https://www.popmart.com/gb/products/1064/the-monsters-big-into-energy-series-vinyl-plush-pendant-blind-box";
const testEmail = "davidkraku60@gmail.com";

const Monitor = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const { mutate, data, isPending, isSuccess } = useMonitorMutation();
  const [formData, setFormData] = useState({
    name: "",
    email: testEmail,
    productUrl: testProductUrl,
  });

  const { name, email, productUrl } = formData;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !productUrl) {
      setErrorMessage("please fill out all fields");
      return;
    }
    mutate({
      name,
      email,
      productUrl,
    });
  };

  if (isSuccess) {
    return (
      <div className="monitor-success">
        <img src={data?.imageUrl} alt="" />
        <div className="text-wrapper">
          <p> {data?.name} </p>
          <p>Price: £{data.price} </p>
          <p>Stock: {data.stockCount ? data?.stockCount : "Not in stock"} </p>
          <p> {data.description} </p>

          <button>Notify Me When Price Stock Changes</button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return <h1 className="heading center">Loading...</h1>;
  }

  const handleChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };
  return (
    <div id="monitor">
      <div className="form-wrapper">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Email</label>
            <input
              type="text"
              name="email"
              value={email}
              placeholder="Enter your email address"
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label htmlFor="name">Product Link</label>
            <input
              type="text"
              name="productUrl"
              value={productUrl}
              placeholder="eg. https://www.popmart.com/gb/products/1064/the-monsters-big-into-energy-series-vinyl-plush-pendant-blind-box"
              onChange={handleChange}
            />
          </div>
          <p className="error"> {errorMessage ? errorMessage : ""} </p>
          <button>Submit</button>
        </form>
      </div>
    </div>
  );
};

export default Monitor;
