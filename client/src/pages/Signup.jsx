import React, { useState } from "react";

// design
import {
  TextField,
  InputAdornment,
  IconButton,
  OutlinedInput,
  FormControl,
  InputLabel,
  Button,
  FormHelperText,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const Signup = () => {
  // form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // password validation
  let hasSixChar = password.length >= 6;
  let hasLowerChar = /(.*[a-z].*)/.test(password);
  let hasUpperChar = /(.*[A-Z].*)/.test(password);
  let hasNumber = /(.*[0-9].*)/.test(password);
  let hasSpecialChar = /(.*[^a-zA-Z0-9].*)/.test(password);

  return (
    <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
      <div className="text-center mb-5 alert alert-primary">
        <label htmlFor="" className="h2">
          Sign Up
        </label>
      </div>
      <div className="form-group">
        <TextField
          size="small"
          variant="outlined"
          className="form-control mb-3"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="form-group">
        <TextField
          size="small"
          variant="outlined"
          className="form-control mb-3"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="form-group">
        <FormControl
          variant="outlined"
          size="small"
          className="form-control mb-3"
        >
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
        {password && (
          <div className="ml-1 mb-3" style={{ columns: 2 }}>
            <div>
              <small className={hasSixChar ? "text-success" : "text-danger"}>
                at least 6 characters
              </small>
            </div>
            <div>
              <small className={hasLowerChar ? "text-success" : "text-danger"}>
                at least one lowercase character
              </small>
            </div>
            <div>
              <small className={hasUpperChar ? "text-success" : "text-danger"}>
                at least one uppercase character
              </small>
            </div>
            <div>
              <small className={hasNumber ? "text-success" : "text-danger"}>
                at least one number
              </small>
            </div>
            <div>
              <small
                className={hasSpecialChar ? "text-success" : "text-danger"}
              >
                at least one symbol
              </small>
            </div>
          </div>
        )}
      </div>
      <div className="form-group">
        <TextField
          size="small"
          variant="outlined"
          className="form-control"
          label="Confirm Password"
          type="password"
          value={confirmpassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {password && confirmpassword && (
          <FormHelperText className="ml-1 mt-1">
            {password === confirmpassword ? (
              <span className="text-success">Password does match</span>
            ) : (
              <span className="text-danger">Password does not match</span>
            )}
          </FormHelperText>
        )}
      </div>
      <div className="text-center mt-4">
        <Button
          variant="contained"
          color="primary"
          disabled={
            !email ||
            !password ||
            !confirmpassword ||
            !username ||
            password !== confirmpassword ||
            !hasSixChar ||
            !hasLowerChar ||
            !hasUpperChar ||
            !hasNumber ||
            !hasSpecialChar
          }
        >
          Submit
        </Button>
      </div>
    </div>
  );
};

export default Signup;
