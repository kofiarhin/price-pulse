import "./monitor.styles.scss";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useMonitorMutation from "../../hooks/useMonitorMutation";

const Monitor = () => {
  const navigate = useNavigate();
  const { mutate, isPending, isSuccess } = useMonitorMutation();
  const [formData, setFormData] = useState({
    name: "test",
    email: "davidkraku69@gmail.com",
    productUrl: "some product url",
  });

  const { name, email, productUrl } = formData;

  if (isSuccess) {
    navigate("/success");
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({
      name,
      email,
      productUrl,
    });
  };

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
            <label htmlFor="name">Product Name</label>
            <input
              type="text"
              name="name"
              value={name}
              placeholder="Enter product name"
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label htmlFor="name">Product url</label>
            <input
              type="text"
              name="productUrl"
              value={productUrl}
              placeholder="Enter product name"
              onChange={handleChange}
            />
          </div>
          <button>Submit</button>
        </form>
      </div>
    </div>
  );
};

export default Monitor;
