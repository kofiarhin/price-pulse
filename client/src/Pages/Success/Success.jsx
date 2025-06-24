import "./success.styles.scss";
import { Link } from "react-router-dom";

const Success = () => {
  return (
    <div id="success" className="page">
      <h1 className="heading center"> Awesome</h1>
      <p>You will be notified when price drops</p>
      <Link to="/">Start new Monitor</Link>
    </div>
  );
};

export default Success;
