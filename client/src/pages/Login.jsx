import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

// design
import {
  TextField,
  InputAdornment,
  IconButton,
  OutlinedInput,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

// API functions
import { login } from "../api/user";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);
  // form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password });
      if (res.error) toast.error(res.error);
      else {
        toast.success(res.message);
        // set user in context
        setUser({ username: res.username, role: res.role });
        // redirect to home page
        navigate("/");
      }
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="home">
      <div className="container mt-5 col-10 col-sm-8 col-md-6 col-lg-5">
        <div className="text-center mb-5 alert alert-primary">
          <label htmlFor="" className="h2">
            Login
          </label>
        </div>
        <div className="form-group mb-3">
          <TextField
            size="small"
            variant="outlined"
            className="form-control"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group mb-3">
          <FormControl variant="outlined" size="small" className="form-control">
            <InputLabel htmlFor="outlined-adornment-password">
              Password
            </InputLabel>
            <OutlinedInput
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <InputAdornment>
                  <IconButton
                    edge="end"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
        </div>
        <div className="text-center mt-4">
          <Button
            className="mb-4"
            variant="contained"
            color="primary"
            disabled={!email || !password}
            onClick={handleLogin}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
