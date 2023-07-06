export const register = async ({ username, email, password } = {}) => {
  const user = { username, email, password };

  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/register`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    return await res.json();
  } catch (error) {
    throw new Error(`Cant register at this time. ${error}`);
  }
};

export const login = async ({ email, password } = {}) => {
  const user = { email, password };

  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    return await res.json();
  } catch (error) {
    throw new Error(`Cant login at this time. ${error}`);
  }
};

export const logout = async () => {
  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/logout`, {
      method: "GET",
      credentials: "include",
    });

    return await res.json();
  } catch (error) {
    console.log(error);
  }
};

export const getUser = async () => {
  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/user`, {
      method: "GET",
      credentials: "include",
    });

    return await res.json();
  } catch (error) {
    throw new Error("Please login to continue.");
  }
};
